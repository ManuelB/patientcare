sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/core/ResizeHandler", "sap/f/FlexibleColumnLayout"], function(Controller, ResizeHandler, FlexibleColumnLayout) {
    "use strict";

    return Controller.extend("patientcare.manager.view.App", {

        onInit: function() {
            var oComponent = this.getOwnerComponent();
            if (oComponent) {
                this.oRouter = oComponent.getRouter();
                this.oRouter.attachRouteMatched(this.onRouteMatched, this);
                ResizeHandler.register(this.getView().byId("fcl"), this._onResize.bind(this));
            } else {
                Log.warning("Could not get component for AppController for entity " + e);
            }
        },
        onRouteMatched: function(oEvent) {
            var sRouteName = oEvent.getParameter("name"),
                oArguments = oEvent.getParameter("arguments");

            var oModel = this.getOwnerComponent().getModel("Layout");

            var sLayout = oEvent.getParameters().arguments.layout;

            // If there is no layout parameter, query for the default level 0 layout (normally OneColumn)
            if (!sLayout) {
                var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(0);
                sLayout = oNextUIState.layout;
            }

            // Update the layout of the FlexibleColumnLayout
            if (sLayout) {
                oModel.setProperty("/layout", sLayout);
            }

            this._updateUIElements();

            // Save the current route name
            this.currentRouteName = sRouteName;
            this.currentEntity = oArguments["EMailId"];
        },
        onStateChanged: function(oEvent) {
            var bIsNavigationArrow = oEvent.getParameter("isNavigationArrow"),
                sLayout = oEvent.getParameter("layout");

            this._updateUIElements();

            // Replace the URL with the new layout if a navigation arrow was used
            if (bIsNavigationArrow) {
                var oParams = { layout: sLayout };
                oParams["EMailId"] = this.currentEntity;
                this.oRouter.navTo(this.currentRouteName, oParams, true);
            }
        },

        // Update the close/fullscreen buttons visibility
        _updateUIElements: function() {
            var oModel = this.getOwnerComponent().getModel("Layout");
            var oUIState = this.getOwnerComponent().getHelper().getCurrentUIState();
            oModel.setData(oUIState);
        },
        _onResize: function(oEvent) {
            var bPhone = (oEvent.size.width < FlexibleColumnLayout.TABLET_BREAKPOINT);
            this.getOwnerComponent().getModel("Layout").setProperty("/isPhone", bPhone);
        },

        onExit: function() {
            this.oRouter.detachRouteMatched(this.onRouteMatched, this);
        },
        onCollapseExpandPress: function() {
            var oSideNavigation = this.byId("sideNavigation");
            var bExpanded = oSideNavigation.getExpanded();

            oSideNavigation.setExpanded(!bExpanded);
        },
        onEMailPress: function(oEvent) {
            var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(1),
                sEmailId = oEvent.getSource().getBindingContext("JMap").getObject().id;

            var oParams = { layout: oNextUIState.layout };
            oParams["EMailId"] = sEmailId;
            this.oRouter.navTo("EMail", oParams);
        }

    });
});