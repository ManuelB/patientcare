sap.ui.define(["sap/ui/core/mvc/Controller", "sap/base/Log", "sap/ui/model/json/JSONModel", "sap/ui/core/Fragment", "sap/base/security/URLWhitelist"], function(Controller, Log, JSONModel, Fragment, URLWhitelist) {
    "use strict";

    return Controller.extend("patientcare.manager.view.Attachment", {

        onInit: function() {
            let oComponent = this.getOwnerComponent();
            if (oComponent) {
                this.oRouter = oComponent.getRouter();
                this.oRouter.getRoute("EMail").attachMatched(this.onRouteMatched, this);
            } else {
                Log.warning("Could not get component for AppController for entity " + e);
            }
            URLWhitelist.add("blob");
        },
        onRouteMatched: function(oEvent) {
            let sRouteName = oEvent.getParameter("name"),
                oArguments = oEvent.getParameter("arguments");
            if (oArguments.blobId) {
                this._sBlobId = oArguments.blobId;
                this.getOwnerComponent().getModel("JMap").downloadBlob(this._sBlobId).then((oBlob) => {
                    const sContentType = oBlob.headers.get('content-type');
                    if (sContentType && sContentType.includes('application/fhir+json')) {
                        return Promise.all([sContentType, oBlob.json()]);
                    } else {
                        return Promise.all([sContentType, oBlob.arrayBuffer()]);
                    }
                }).then(oData => {
                    if (oData[0] === "application/fhir+json") {
                        this.setAttachmentFragment(oData[0]);
                        const oModel = new JSONModel();
                        oModel.setData(oData[1]);
                        this.getView().setModel(oModel);
                    } else if (oData[0] === "image/jpeg" || oData[0] === "application/pdf") {
                        this.setAttachmentFragment(oData[0]);
                        const oModel = new JSONModel();
                        oModel.setProperty("/blobUrl", URL.createObjectURL(new Blob([oData[1]], { type: oData[0] })));
                        this.getView().setModel(oModel);
                    } else {
                        Log.warning("Unsupported mime type found: " + oData[0]);
                    }
                });
            }
        },
        toBase64: function(buffer) {
            var binary = '';
            var bytes = new Uint8Array(buffer);
            var len = bytes.byteLength;
            for (var i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        },
        setAttachmentFragment: function(sMimeType) {
            const oPage = this.byId("page");
            oPage.removeAllContent();
            Fragment.load({
                "name": "patientcare.manager.view.attachments." + sMimeType.replace("/", "_").replace("+", "_").replace(/;.*/, "")
            }).then((oFragment) => {
                oPage.addContent(oFragment);
            });
        }
    });
});