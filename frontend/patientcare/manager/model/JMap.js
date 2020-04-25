sap.ui.define(["./JMapTreeBinding", "sap/ui/model/json/JSONModel", "sap/ui/core/Fragment", "sap/base/Log"],
    function(JMapTreeBinding, JSONModel, Fragment, Log) {
        "use strict";

        var JMap = JSONModel.extend("patientcare.manager.model.JMap", {
            "constructor": function() {
                JSONModel.apply(this, arguments);
                this._oInbox = null;
                if (window.localStorage.getItem("JMap") === null) {
                    this.requestConfig();
                } else {
                    this.loadConfig();
                }

            }

        });
        JMap.prototype.requestConfig = function(fnCallback) {
            Fragment.load({
                name: "patientcare.manager.model.ConfigureJMap",
                controller: this
            }).then((oDialog) => {
                oDialog.setModel(new JSONModel());
                oDialog.open();
                this.oDialog = oDialog;
            });
        };

        JMap.prototype.onSave = function() {
            this.oDialog.close();
            window.localStorage.setItem("JMap", JSON.stringify(this.oDialog.getModel().getData()));
            this.loadConfig();
        };

        JMap.prototype.loadConfig = function() {
            let oData = JSON.parse(window.localStorage.getItem("JMap"));
            this.sBaseUrl = oData.baseUrl;
            this.sUsername = oData.username;
            this.sPassword = oData.password;

            this.initModel();
        };

        JMap.prototype.initModel = function() {
            let that = this;
            try {
                O.RunLoop.invoke(() => {
                    var rootMailboxes = JMAP.store.getQuery('rootMailboxes', O.LocalQuery, {
                        Type: JMAP.Mailbox,
                        filter: function(data) {
                            return !data.parentId;
                        },
                        sort: JMAP.Mailbox.bySortOrderRoleOrName
                    });

                    rootMailboxes.addObserverForKey('[]', {
                        go: function(rootMailboxes, key) {
                            rootMailboxes.removeObserverForKey(key, this, 'go');
                            that._oInbox = JMAP.mail.getMailboxForRole(null, 'inbox');
                        }
                    }, 'go');
                    JMAP.auth.addObserverForKey('isAuthenticated', {
                        'fetchInitialData': function() {
                            JMAP.store.fetchAll(JMAP.Mailbox);
                        }
                    }, 'fetchInitialData');

                    var allMailboxes = new O.ObservableArray(null, {
                        content: JMAP.store.getQuery('allMailboxes', O.LocalQuery, {
                            Type: JMAP.Mailbox
                        }),
                        contentDidChange: function() {
                            var mailboxes = this.get('content').get('[]');
                            mailboxes.sort(JMAP.Mailbox.byMailSourceOrder);
                            return this.set('[]', mailboxes);
                        }.queue('before')
                    }).contentDidChange();

                    allMailboxes.addObserverForKey('[]', {
                        go: function(allMailboxes, key) {
                            that.setProperty("/Mailboxes", allMailboxes.get("[]").map(oMailbox => { return { "name": oMailbox.get("name") }; }));
                        }
                    }, 'go');

                    JMAP.store.on(JMAP.Mailbox, allMailboxes, 'contentDidChange');


                    var server = this.sBaseUrl + "/authentication";
                    var username = this.sUsername;
                    var password = this.sPassword;
                    var accessToken = 'Basic ' + btoa(username + ':' + password);
                    JMAP.auth.fetchSession(server, accessToken, username, password);

                });
            } catch (e) {
                Log.error(e);
            }
            /*
            fetch(this.sBaseUrl, {
                "headers": { "Authorization": "Basic " + btoa(this.sUsername + ":" + this.sPassword) }
            }).then((o) => o.json()).then((oJson) => {
                this.setData(oJson);
            });*/
        };

        /**
         * @see sap.ui.model.Model.prototype.bindTree
         *
         * @param {object}
         *         [mParameters=null] additional model specific parameters (optional)
         *         If the mParameter <code>arrayNames</code> is specified with an array of string names this names will be checked against the tree data structure
         *         and the found data in this array is included in the tree but only if also the parent array is included.
         *         If this parameter is not specified then all found arrays in the data structure are bound.
         *         If the tree data structure doesn't contain an array you don't have to specify this parameter.
         *
         */
        JMap.prototype.bindTree = function(sPath, oContext, aFilters, mParameters, aSorters) {
            var oBinding = new JMapTreeBinding(this, sPath, oContext, aFilters, mParameters, aSorters);
            return oBinding;
        };

        return JMap;
    });