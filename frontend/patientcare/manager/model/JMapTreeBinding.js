sap.ui.define(['sap/ui/model/json/JSONTreeBinding'],
    function(JSONTreeBinding) {
        "use strict";
        var JMapTreeBinding = JSONTreeBinding.extend("pass.manager.model.JMapTreeBinding");

        JMapTreeBinding.prototype.getNodeContexts = function(oContext, iStartIndex, iLength) {
            return JSONTreeBinding.prototype.getNodeContexts.apply(this, arguments);
        };

        return JMapTreeBinding;
    });