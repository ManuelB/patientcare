sap.ui.define(["sap/ui/core/mvc/Controller"], function(Controller) {
    "use strict";

    return Controller.extend("patientcare.manager.view.EMail", {

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
            this.getView().bindObject("JMap>/EMails/" + oArguments.EMailId)
        }

    });
});