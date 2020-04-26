sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/core/Fragment", "sap/base/Log", "sap/m/MessageBox",
        'sap/ui/model/json/JSONPropertyBinding'
    ],
    function(JSONModel, Fragment, Log, MessageBox, JSONPropertyBinding) {
        "use strict";

        const JMap = JSONModel.extend("patientcare.manager.model.JMap", {
            "constructor": function() {
                JSONModel.apply(this, arguments);
                this._oInboxId = null;
                this._pLoggedIn = new Promise((fnResolve) => {
                    this._fnLoggedIn = fnResolve;
                });
                if (window.localStorage.getItem("JMap") === null) {
                    this.requestConfig();
                } else {
                    this.loadConfigAndInitModel();
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
            this.loadConfigAndInitModel();
        };

        JMap.prototype.loadConfigAndInitModel = function() {
            let oData = JSON.parse(window.localStorage.getItem("JMap"));
            this.sBaseUrl = oData.baseUrl;
            this.sUsername = oData.username;
            this.sPassword = oData.password;
            this.initModel();
        };

        JMap.prototype.loggedIn = function() {
            return this._pLoggedIn;
        };

        JMap.prototype.initModel = function() {
            try {
                this.setData({ "Mailboxes": [], "Emails": [] });
                this.login();
                this.loggedIn()
                    .then(() => this.getMailboxes())
                    .then(() => this.getMessageList(this._oInbox.id));
            } catch (e) {
                Log.error(e);
            }
        };

        /**
         * This function sends first an continuation token request to the server, afterwards it sends
         * an access token requests. This is tested with Apache James 3.5.0 JMapDraft implementation. 
         */
        JMap.prototype.login = function() {
            const sAuthentifcationUrl = this.sBaseUrl + "/authentication";
            const sUsername = this.sUsername;
            const sPassword = this.sPassword;
            const sBasicAuthToken = 'Basic ' + btoa(sUsername + ':' + sPassword);
            fetch(sAuthentifcationUrl, {
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json; charset=UTF-8",
                    "Accept": "application/json",
                    "Authorization": sBasicAuthToken
                },
                // Create ContinuationTokenRequest: org.apache.james.jmap.draft.model.ContinuationTokenRequest
                "body": JSON.stringify({ "username": sUsername, "clientName": "patientcare.manager.model.JMap", "clientVersion": "1.0", "deviceName": window.navigator.userAgent })
            }).then((oResponse) => {
                return oResponse.json();
            }).then((oContinuationToken) => {
                return fetch(sAuthentifcationUrl, {
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/json; charset=UTF-8",
                        "Accept": "application/json",
                        "Authorization": sBasicAuthToken
                    },
                    // Create AccessTokenRequest: org.apache.james.jmap.draft.model.AccessTokenRequest
                    "body": JSON.stringify({ "token": oContinuationToken.continuationToken, "method": "password", "password": sPassword })
                });
            }).then((oResponse) => {
                return oResponse.json();
            }).then((oSessionInfo) => {
                this._oSessionInfo = oSessionInfo;
                this._fnLoggedIn();
            }).catch((oError) => {
                Log.error(oError);
                MessageBox.error("Could not connect to JMap server: " + sAuthentifcationUrl + " " + oError);
            });
        };

        /**
         * This functions sends a getMailboxes requests and sets the property /Mailboxes
         */
        JMap.prototype.getMailboxes = function() {
            return new Promise((fnResolve) => {
                const sApiUrl = this.sBaseUrl + this._oSessionInfo.api;
                fetch(sApiUrl, {
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/json; charset=UTF-8",
                        "Accept": "application/json",
                        "Authorization": this._oSessionInfo.accessToken
                    },
                    "body": JSON.stringify([
                        ["getMailboxes", {}, "#0"]
                    ])
                }).then((oResponse) => {
                    return oResponse.json();
                }).then((oMailboxesResponse) => {
                    const aMailboxes = oMailboxesResponse[0][1].list;
                    this._oInbox = aMailboxes.filter((o) => o.role == "inbox")[0];
                    this.setProperty("/Mailboxes", aMailboxes);
                    fnResolve();
                }).catch((oError) => {
                    Log.error(oError);
                    MessageBox.error("Could not receive Mailboxes from " + sApiUrl + " " + oError);
                });
            });
        };

        JMap.prototype.getMessageList = function(sMailboxId) {
            const sApiUrl = this.sBaseUrl + this._oSessionInfo.api;
            fetch(sApiUrl, {
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json; charset=UTF-8",
                    "Accept": "application/json",
                    "Authorization": this._oSessionInfo.accessToken
                },
                "body": JSON.stringify([
                    ["getMessageList", {
                        filter: {
                            inMailboxes: [sMailboxId]
                        },
                        sort: ["date desc", "id desc"],
                        collapseThreads: true,
                        position: 0,
                        limit: 10,
                        fetchMessages: true,
                        fetchMessageProperties: ["id", "blobId", "threadId", "mailboxIds", "inReplyToMessageId", "headers", "from", "to", "cc", "bcc", "replyTo", "subject", "date", "size", "preview", "keywords", "hasAttachment", "attachments", "textBody", "htmlBody"]
                    }, "#1"]
                ])
            }).then((oResponse) => {
                return oResponse.json();
            }).then((oMessageListResponse) => {
                const aMessages = oMessageListResponse[1][1].list;
                const mMessages = {};
                for (let oMessage of aMessages) {
                    mMessages[oMessage.id] = oMessage;
                }
                this.setProperty("/EMails", mMessages);
            }).catch((oError) => {
                Log.error(oError);
                MessageBox.error("Could not receive MessageList from " + sApiUrl + " " + oError);
            });
        };

        JMap.prototype.bindProperty = function(sPath, oContext, mParameters) {
            var oBinding = new JSONPropertyBinding(this, sPath, oContext, mParameters);
            oBinding.attachChange(this.onPropertyBinding, this);
            return oBinding;
        };

        JMap.prototype.onPropertyBinding = function(oEvent) {
            // debugger
        };

        return JMap;
    });