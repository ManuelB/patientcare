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
            this._sEmailId = oArguments.EMailId;
            this.getView().bindElement("JMap>/EMails/" + oArguments.EMailId);
        },
        onFullScreen: function() {
            this.navToLayoutProperty("/actionButtonsInfo/midColumn/fullScreen");
        },
        navToLayoutProperty: function(sLayoutProperty) {
            var oLayoutModel = this.getOwnerComponent().getModel("Layout");
            var sNextLayout = oLayoutModel.getProperty(sLayoutProperty);
            var oParams = { layout: sNextLayout };
            oParams["EMailId"] = this._sEmailId;
            this.oRouter.navTo("EMail", oParams);
        },
        onExitFullScreen: function() {
            this.navToLayoutProperty("/actionButtonsInfo/midColumn/exitFullScreen");
        },
        onClose: function() {
            var oLayoutModel = this.getOwnerComponent().getModel("Layout");
            var sNextLayout = oLayoutModel.getProperty("/actionButtonsInfo/midColumn/closeColumn");
            this.oRouter.navTo("Home", { layout: sNextLayout });
        },
        onAttachmentItemPress: function(oEvent) {
            var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(2),
                sBlobId = oEvent.getSource().getBindingContext("JMap").getObject().blobId;

            var oParams = { layout: oNextUIState.layout };
            oParams["EMailId"] = this._sEmailId;
            oParams["blobId"] = sBlobId;
            this.oRouter.navTo("EMail", oParams);
        }
    });
});