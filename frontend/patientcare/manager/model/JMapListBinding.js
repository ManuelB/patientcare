// Provides the JSON model implementation of a list binding
sap.ui.define([
        "sap/ui/model/json/JSONListBinding",
        "sap/base/Log",
        "sap/ui/model/ChangeReason",
        "sap/ui/model/FilterType",
        "sap/ui/model/FilterProcessor",
        "sap/ui/model/Filter"
    ],
    function(JSONListBinding, Log, ChangeReason, FilterType, FilterProcessor, Filter) {
        "use strict";



        /**
         * Creates a new JMapListBinding.
         *
         * This constructor should only be called by subclasses or model implementations, not by application or control code.
         * Such code should use {@link patiencare.manager.model.JMap#bindList JMap#bindList} on the corresponding model instance instead.
         *
         * @param {patiencare.manager.model.JMapModel} oModel Model instance that this binding is created for and that it belongs to
         * @param {string} sPath Binding path to be used for this binding
         * @param {sap.ui.model.Context} oContext Binding context relative to which a relative binding path will be resolved
         * @param {sap.ui.model.Sorter|sap.ui.model.Sorter[]} [aSorters] Initial sort order (can be either a sorter or an array of sorters)
         * @param {sap.ui.model.Filter|sap.ui.model.Filter[]} [aFilters] Predefined filter/s (can be either a filter or an array of filters)
         * @param {object} [mParameters] Map of optional parameters as defined by subclasses; this class does not introduce any own parameters
         * @throws {Error} When one of the filters uses an operator that is not supported by the underlying model implementation
         *
         * @class
         * List binding implementation for JSON format.
         *
         * @alias sap.ui.model.json.JSONListBinding
         * @extends sap.ui.model.json.JSONListBinding
         * @protected
         */
        var JMapListBinding = JSONListBinding.extend("patiencare.manager.model.JMapListBinding");

        JMapListBinding.prototype.filter = function(aFilters, sFilterType) {
            this.iLastTotalLoaded = undefined;

            this.oModel.checkFilterOperation(aFilters);

            if (this.bSuspended) {
                this.checkUpdate(true);
            }
            if (aFilters instanceof Filter) {
                aFilters = [aFilters];
            }
            if (sFilterType == FilterType.Application) {
                this.aApplicationFilters = aFilters || [];
            } else if (sFilterType == FilterType.Control) {
                this.aFilters = aFilters || [];
            } else {
                //Previous behaviour
                this.aFilters = aFilters || [];
                this.aApplicationFilters = [];
            }

            this.oCombinedFilter = FilterProcessor.combineFilters(this.aFilters, this.aApplicationFilters);
            // const retVal = JSONListBinding.prototype.filter.apply(this, arguments);
            this._fireChange({ reason: ChangeReason.Filter });
            // return retVal;
        };

        /**
         * Return contexts for the list.
         *
         * @param {int} [iStartIndex] The start index of the requested contexts
         * @param {int} [iLength] The requested amount of contexts
         * @param {int} [iThreshold] The threshold value
         * @return {sap.ui.model.Context[]} The array of contexts for each row of the bound list
         * @protected
         */
        JMapListBinding.prototype.getContexts = function(iStartIndex, iLength, iThreshold) {
            this.iLastStartIndex = iStartIndex;
            this.iLastLength = iLength;
            this.iLastThreshold = iThreshold;

            if (!iStartIndex) {
                iStartIndex = 0;
            }
            if (!iLength) {
                iLength = Math.min(this.iLength, this.oModel.iSizeLimit);
            }

            this.updateIndices();
            var aContexts = this._getContexts(iStartIndex, iLength),
                aContextData = [];

            const aSort = this.aSorters.map((oSorter) => oSorter.sPath + " " + (oSorter.bDescending ? "desc" : "asc"));

            // always load the requested emails
            if (this.sPath == "/EMails" && (this.iLastTotalLoaded == undefined || iStartIndex + iLength > this.iLastTotalLoaded)) {
                this.fireDataRequested();

                let aMailbox = undefined;
                let aFilters = this.aFilters.filter(o => o.sPath === "inMailboxes");
                if (aFilters.length > 0) {
                    aMailbox = [aFilters[0].oValue1];
                }

                let sQuery = undefined;
                aFilters = this.aFilters.filter(o => o.sPath === "query");
                if (aFilters.length > 0) {
                    sQuery = aFilters[0].oValue1;
                }

                this.oModel.getMessageList(aMailbox, iStartIndex, iLength, aSort, sQuery).then(() => {
                    this.iTotalLength = this.oModel.getMessageListCount(aMailbox);
                    // this.update();
                    this.fireDataReceived();
                    this._fireChange({ reason: ChangeReason.Change });
                });
                aContexts.dataRequested = true;
            }
            this.iLastTotalLoaded = iStartIndex + iLength;

            if (this.bUseExtendedChangeDetection) {
                // Use try/catch to detect issues with cyclic references in JS objects,
                // in this case diff will be disabled.
                try {
                    for (var i = 0; i < aContexts.length; i++) {
                        aContextData.push(this.getContextData(aContexts[i]));
                    }

                    //Check diff
                    if (this.aLastContextData && iStartIndex < this.iLastEndIndex) {
                        aContexts.diff = this.diffData(this.aLastContextData, aContextData);
                    }

                    this.iLastEndIndex = iStartIndex + iLength;
                    this.aLastContexts = aContexts.slice(0);
                    this.aLastContextData = aContextData.slice(0);
                } catch (oError) {
                    this.bUseExtendedChangeDetection = false;
                    Log.warning("JSONListBinding: Extended change detection has been disabled as JSON data could not be serialized.");
                }
            }

            return aContexts;
        };

        JMapListBinding.prototype.getLength = function() {
            return this.iLastStartIndex + this.iLastLength;
        };

        JMapListBinding.prototype.isLengthFinal = function() {
            return this.iTotalLength ? (this.iTotalLength <= this.getLength()) : JSONListBinding.prototype.isLengthFinal.apply(this, arguments);
        };

        return JMapListBinding;
    });