sap.ui.define(["sap/ui/core/mvc/Controller", "sap/m/MessageBox", "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History"
], function(Controller, MessageBox, JSONModel, History) {
    "use strict";

    return Controller.extend("patientcare.manager.view.SendEMail", {

        onInit: function() {
            this._oEmailModel = new JSONModel();
            this._oEmailModel.setData({
                "to": [{}],
                "cc": [{}],
                "bcc": [{}]
            })
            this.getView().setModel(this._oEmailModel);
        },
        onReject: function() {
            this.closeAndBack();
        },
        closeAndBack: function() {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("Home", { "layout": "OneColumn" });
            }
            this.byId("dialog").close();
        },
        onSend: function() {
            this.getView().getModel("JMap").sendMail(this._oEmailModel.getData())
                .then(() => {
                    MessageBox.success("Email successfully send", {
                        "title": "Success",
                        "onClose": () => {
                            this.closeAndBack();
                        }
                    });
                })
                .catch((sError) => {
                    MessageBox.error("Could not send email: " + sError, { "title": "Error" });
                });
        },
        createObjectMarker: function() {

        }
    });
});