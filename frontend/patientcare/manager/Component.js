sap.ui.define(["sap/ui/core/UIComponent", "sap/ui/model/json/JSONModel", "sap/f/FlexibleColumnLayoutSemanticHelper", "./Onboarding"],
    function(UIComponent, JSONModel, FlexibleColumnLayoutSemanticHelper, Onboarding) {
        "use strict";
        return UIComponent.extend("patientcare.manager.Component", {

            metadata: {
                manifest: "json"
            },
            init: function() {

                // call the init function of the parent
                UIComponent.prototype.init.apply(this, arguments);

                var oModel = new JSONModel();
                this.setModel(oModel, "Layout");

                // create the views based on the url/hash
                this.getRouter().initialize();

                new Onboarding(this);
            },

            /**
             * Returns an instance of the semantic helper
             * @returns {sap.f.FlexibleColumnLayoutSemanticHelper} An instance of the semantic helper
             */
            getHelper: function() {
                var oFCL = this.getRootControl().byId("fcl"),
                    oParams = jQuery.sap.getUriParameters(),
                    oSettings = {
                        defaultTwoColumnLayoutType: sap.f.LayoutType.TwoColumnsMidExpanded,
                        defaultThreeColumnLayoutType: sap.f.LayoutType.ThreeColumnsMidExpanded,
                        mode: oParams.get("mode"),
                        initialColumnsCount: oParams.get("initial"),
                        maxColumnsCount: oParams.get("max")
                    };

                return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
            }
        });
    });