sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/core/ResizeHandler", "sap/f/FlexibleColumnLayout",
    "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "sap/ui/core/mvc/View"
], function(Controller, ResizeHandler, FlexibleColumnLayout, Filter, FilterOperator, View) {
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
            oComponent.getModel("JMap").attachEvent("totalUnreadMessages", function(oEvent) {
                this.byId("shellBar").setNotificationsNumber(oEvent.getParameter("count") + "");
            }, this);
        },
        onRouteMatched: function(oEvent) {
            var sRouteName = oEvent.getParameter("name"),
                oArguments = oEvent.getParameter("arguments");

            if (sRouteName == "SendEMail") {
                if (!this._oSendDialogView) {
                    this.getOwnerComponent().runAsOwner(() => {
                        View.create({
                            "viewName": "patientcare.manager.view.SendEMail",
                            "type": "XML"
                        }).then((oView) => {
                            this.getView().addDependent(oView);
                            this._oSendDialogView = oView;
                            this._oSendDialogView.getContent()[0].open();
                        });
                    });
                } else {
                    this._oSendDialogView.getContent()[0].open();
                }
            } else {
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
            }

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
        onItemSelect: function(oEvent) {
            this._sSelectedMailbox = oEvent.getParameter("item").getBindingContext("JMap").getProperty("id");
            this.applyFilter();
        },
        onSearch: function(oEvent) {
            this._sQuery = oEvent.getParameter("newValue");
            this.applyFilter();
        },
        applyFilter: function() {
            const aFilters = [];
            if (this._sSelectedMailbox) {
                aFilters.push(new Filter("inMailboxes", FilterOperator.EQ, this._sSelectedMailbox));
            }
            if (this._sQuery && this._sQuery.length > 2) {
                aFilters.push(new Filter("query", FilterOperator.Contains, this._sQuery));
            }
            this.byId("email").getBinding("items").filter(aFilters);
        },
        onEMailPress: function(oEvent) {
            var oNextUIState = this.getOwnerComponent().getHelper().getNextUIState(1),
                sEmailId = oEvent.getSource().getBindingContext("JMap").getProperty("id");

            var oParams = { layout: oNextUIState.layout };
            oParams["EMailId"] = sEmailId;
            this.oRouter.navTo("EMail", oParams);
        },
        onCreateEmail: function(oEvent) {
            this.oRouter.navTo("SendEMail");
        },
        onProfile: function(oEvent) {
            this.byId("profile").getContent()[0].open();
        },
	mailboxIcon: function(sMailboxName) {
            if(sMailboxName === "INBOX") {
                return "sap-icon://inbox";
	    } else if(sMailboxName === "Drafts") {
                return "sap-icon://notes";
	    } else if(sMailboxName === "Outbox") {
                return "sap-icon://outbox";
            } else if(sMailboxName === "Sent") {
                return "sap-icon://paper-plane";
            } else if(sMailboxName === "Trash") {
                return "sap-icon://delete";
            } else if(sMailboxName === "Spam") {
                return "sap-icon://decline";
            }
	}
    });
});
