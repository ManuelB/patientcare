sap.ui.define(["sap/ui/core/mvc/Controller", "sap/m/MessageBox"], function(Controller, MessageBox) {
    "use strict";

    return Controller.extend("patientcare.manager.view.Profile", {

        onInit: function() {

        },
        onSave: function(oEvent) {
            this.getView().getModel("JMap").save();
            this.getView().getModel("OpenPGP").save();
            this.byId("dialog").close();
        },
        onClose: function(oEvent) {
            this.byId("dialog").close();
        }
    });
});