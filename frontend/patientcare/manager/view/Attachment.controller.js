sap.ui.define(["sap/ui/core/mvc/Controller", "sap/base/Log", "sap/ui/model/json/JSONModel"], function(Controller, Log, JSONModel) {
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
                        const oModel = new JSONModel();
                        oModel.setData(oData[1]);
                        this.getView().setModel(oModel);
                    } else {
                        Log.warning("Unsupported mime type found: " + oData[0]);
                    }
                });
            }
        }
    });
});