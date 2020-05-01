sap.ui.define(["./JMapListBinding", "sap/ui/model/json/JSONModel", "sap/ui/core/Fragment", "sap/base/Log", "sap/m/MessageBox"],
    function(JMapListBinding, JSONModel, Fragment, Log, MessageBox, ChangeReason) {
        "use strict";

        const JMap = JSONModel.extend("patientcare.manager.model.JMap", {
            "constructor": function() {
                JSONModel.apply(this, arguments);
                this._oInboxId = null;
                this._oOutboxId = null;
                this.mMessageBoxId2TotalMessages = {};
                this._pInboxFound = new Promise((fnResolve) => {
                    this._fnInboxFound = fnResolve;
                });
                this._pOutboxFound = new Promise((fnResolve) => {
                    this._fnOutboxFound = fnResolve;
                });
                this._pLoggedIn = new Promise((fnResolve) => {
                    this._fnLoggedIn = fnResolve;
                });
                if (window.localStorage.getItem("JMap") !== null) {
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

        JMap.prototype.inboxFound = function() {
            return this._pInboxFound;
        };

        JMap.prototype.outboxFound = function() {
            return this._pOutboxFound;
        };

        JMap.prototype.initModel = function() {
            try {
                this.setData({ "Mailboxes": [], "Emails": [] });
                this.login();
                this.getMailboxes();
                // this.inboxFound().then((oInbox) => this.getMessageList());
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
            const sUsername = this.transformUser(this.sUsername);
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
            return this.loggedIn().then(() => {
                return new Promise((fnResolve, fnReject) => {
                    const sApiUrl = this.sBaseUrl + this._oSessionInfo.api;

                    this.fireRequestSent({ url: sApiUrl, type: "POST", async: true });
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
                        let iUnreadMessages = 0;
                        for (let oMailbox of aMailboxes) {
                            this.mMessageBoxId2TotalMessages[oMailbox.id] = oMailbox.totalMessages;
                            iUnreadMessages += oMailbox.unreadMessages;
                        }
                        this.fireEvent("totalUnreadMessages", { "count": iUnreadMessages });

                        const oInbox = aMailboxes.filter((o) => o.role == "inbox")[0];
                        this._oInboxId = oInbox.id;
                        this._fnInboxFound(oInbox);

                        const oOutbox = aMailboxes.filter((o) => o.role == "outbox")[0];
                        this._oOutboxId = oOutbox.id;
                        this._fnOutboxFound(oOutbox);

                        this.setProperty("/Mailboxes", aMailboxes);
                        this.fireRequestCompleted({ url: sApiUrl, type: "POST", async: true });
                        fnResolve(aMailboxes);
                    }).catch((oError) => {
                        this.fireRequestCompleted({ url: sApiUrl, type: "POST", async: true });
                        Log.error(oError);
                        this.fireRequestFailed(oError);
                        MessageBox.error("Could not receive Mailboxes from " + sApiUrl + " " + oError);
                        fnReject(oError);
                    });
                });
            });
        };


        JMap.prototype.getMessageListCount = function(aMailboxIds) {
            if (aMailboxIds === undefined || aMailboxIds.length === 0) {
                return this.mMessageBoxId2TotalMessages[this._oInboxId];
            } else if (aMailboxIds.length === 1) {
                return this.mMessageBoxId2TotalMessages[aMailboxIds[0]];
            } else {
                throw new Error("Not implemented yet");
            }
        };

        JMap.prototype.getMessageList = function(aMailboxIds, iStartIndex, iLength, aSort, sQuery) {
            return Promise.all([this.loggedIn(), this.inboxFound()]).then(() => {
                return new Promise((fnResolve, fnReject) => {

                    if (iLength === undefined) {
                        iLength = this.iSizeLimit;
                    }
                    const sApiUrl = this.sBaseUrl + this._oSessionInfo.api;

                    this.fireRequestSent({ url: sApiUrl, type: "POST", async: true });

                    const oParams = {
                        filter: {

                        },
                        sort: aSort === undefined ? ["date desc", "id desc"] : aSort,
                        collapseThreads: true,
                        position: iStartIndex === undefined ? 0 : iStartIndex,
                        limit: iLength,
                        fetchMessages: true,
                        fetchMessageProperties: ["id", "blobId", "threadId", "mailboxIds", "inReplyToMessageId", "headers", "from", "to", "cc", "bcc", "replyTo", "subject", "date", "size", "preview", "keywords", "hasAttachment", "attachments", "textBody", "htmlBody"]
                    };
                    oParams.filter.inMailboxes = aMailboxIds === undefined ? [this._oInboxId] : aMailboxIds;
                    if (sQuery) {
                        oParams.filter.text = sQuery;
                    }

                    fetch(sApiUrl, {
                        "method": "POST",
                        "headers": {
                            "Content-Type": "application/json; charset=UTF-8",
                            "Accept": "application/json",
                            "Authorization": this._oSessionInfo.accessToken
                        },
                        "body": JSON.stringify([
                            ["getMessageList", oParams, "#1"]
                        ])
                    }).then((oResponse) => {
                        return oResponse.json();
                    }).then((oMessageListResponse) => {
                        const aMessages = oMessageListResponse[1][1].list;
                        const mMessages = {};
                        const oldEmails = this.getProperty("/EMails");
                        for (let i = 0; i < iStartIndex; i++) {
                            mMessages[i] = oldEmails[Object.keys()[i]];
                        }
                        for (let oMessage of aMessages) {
                            mMessages[oMessage.id] = oMessage;
                        }
                        this.setProperty("/EMails", mMessages);
                        this.fireRequestCompleted({ url: sApiUrl, type: "POST", async: true });
                        fnResolve(mMessages);
                    }).catch((oError) => {
                        this.fireRequestCompleted({ url: sApiUrl, type: "POST", async: true });
                        Log.error(oError);
                        this.fireRequestFailed(oError);
                        MessageBox.error("Could not receive MessageList from " + sApiUrl + " " + oError);
                        fnReject(oError);
                    });
                });
            });
        };

        JMap.prototype.getMessages = function(sMessageId) {
            this.loggedIn().then(() => {
                const sApiUrl = this.sBaseUrl + this._oSessionInfo.api;
                this.fireRequestSent({ url: sApiUrl, type: "POST", async: true });
                fetch(sApiUrl, {
                    "method": "POST",
                    "headers": {
                        "Content-Type": "application/json; charset=UTF-8",
                        "Accept": "application/json",
                        "Authorization": this._oSessionInfo.accessToken
                    },
                    "body": JSON.stringify([
                        ["getMessages", {
                            ids: [sMessageId],
                            properties: ["id", "blobId", "threadId", "mailboxIds", "inReplyToMessageId", "headers", "from", "to", "cc", "bcc", "replyTo", "subject", "date", "size", "preview", "keywords", "hasAttachment", "attachments", "textBody", "htmlBody"]
                        }, "#2"]
                    ])
                }).then((oResponse) => {
                    return oResponse.json();
                }).then((oMessagesResponse) => {
                    console.log(oMessagesResponse);
                    this.fireRequestCompleted({ url: sApiUrl, type: "POST", async: true });
                }).catch((oError) => {
                    this.fireRequestCompleted({ url: sApiUrl, type: "POST", async: true });
                    Log.error(oError);
                    this.fireRequestFailed(oError);
                    MessageBox.error("Could not receive Messages from " + sApiUrl + " " + oError);
                });
            });

        };

        /**
         * @see sap.ui.model.Model.prototype.bindList
         *
         */
        JMap.prototype.bindList = function(sPath, oContext, aSorters, aFilters, mParameters) {
            var oBinding = new JMapListBinding(this, sPath, oContext, aSorters, aFilters, mParameters);
            return oBinding;
        };

        JMap.prototype.downloadBlob = function(sBlobId) {
            return this.loggedIn().then(() => {
                const sDownloadUrl = this.sBaseUrl + this._oSessionInfo.download + "/" + sBlobId;
                return fetch(sDownloadUrl, {
                    "headers": {
                        "Authorization": this._oSessionInfo.accessToken
                    }
                });
            });
        };

        JMap.prototype.createMailAccount = function(sMail, sPassword) {
            return fetch("http://" + window.location.hostname + ":8000/users/" + this.transformUser(sMail), {
                "method": "PUT",
                "body": JSON.stringify({ "password": sPassword })
            }).then((oResponse) => {
                if (oResponse.status === 204) {
                    window.localStorage.setItem("JMap", JSON.stringify({ "baseUrl": "http://" + window.location.hostname, "username": sMail, "password": sPassword }))
                    this.loadConfigAndInitModel();
                } else {
                    oResponse.text().then((sError) => {
                        Log.error(sError)
                    })
                    throw new Error("Could not create mail account: " + oResponse.status);
                }
            });
        };

        JMap.prototype.transformUser = function(sMailUser) {
            // remove .local Domain from user
            // return sMailUser.replace(/\.local$/, "");
            return sMailUser;
        }

        JMap.prototype.clearSettings = function() {
            window.localStorage.removeItem("JMap");
        };

        /**
         * Test for Chrome Web Inspector:
         * const jMap = sap.ui.getCore().getComponent("root-manager")
         *  .getModel("JMap"); jMap.sendMail("test@example.org", "Hallo Manuel",
         *  "Was soll ich sagen, das ist eine Email"); 
         */
        JMap.prototype.sendMail = function(sTo, sSubject, sTextBody, sHtmlBody, aAttachmentBlobIds) {
            return new Promise((fnResolve, fnReject) => {
                Promise.all([this.loggedIn(), this.outboxFound()]).then(() => {

                    const sUuid = this.uuidv4();

                    const aSetMessagesRequests = ["setMessages", {
                        "create": {}
                    }, "#3"];

                    const oEmail = {
                        "mailboxIds": [this._oOutboxId],
                        "from": { "email": this.transformUser(this.sUsername) },
                        "to": [{ "email": sTo }],
                        "subject": sSubject
                    };
                    if (sTextBody) {
                        oEmail.textBody = sTextBody;
                    }
                    if (sHtmlBody) {
                        oEmail.htmlBody = sHtmlBody;
                    }
                    if (aAttachmentBlobIds && aAttachmentBlobIds.length > 0) {
                        oEmail.attachments = aAttachmentBlobIds;
                    }

                    aSetMessagesRequests[1].create[sUuid] = oEmail;


                    const sApiUrl = this.sBaseUrl + this._oSessionInfo.api;
                    this.fireRequestSent({ url: sApiUrl, type: "POST", async: true });
                    fetch(sApiUrl, {
                        "method": "POST",
                        "headers": {
                            "Content-Type": "application/json; charset=UTF-8",
                            "Accept": "application/json",
                            "Authorization": this._oSessionInfo.accessToken
                        },
                        "body": JSON.stringify([aSetMessagesRequests])
                    }).then((oResponse) => {
                        return oResponse.json();
                    }).then((oMessagesResponse) => {
                        console.log(oMessagesResponse);
                        fnResolve();
                        this.fireRequestCompleted({ url: sApiUrl, type: "POST", async: true });
                    }).catch((oError) => {
                        this.fireRequestCompleted({ url: sApiUrl, type: "POST", async: true });
                        Log.error(oError);
                        this.fireRequestFailed(oError);
                        fnReject(oError);
                        MessageBox.error("Could not receive Messages from " + sApiUrl + " " + oError);
                    });
                });
            });
        };

        JMap.prototype.uploadBlob = function(aByteBuffer, sMimeType) {
            return this.loggedIn().then(() => {
                const sUploadUrl = this.sBaseUrl + this._oSessionInfo.upload;
                return fetch(sUploadUrl, {
                    "headers": {
                        "Authorization": this._oSessionInfo.accessToken,
                        "Content-Type": sMimeType ? sMimeType : "application/octet-stream"
                    }
                }).then((oResponse) => oResponse.text());
            });
        }

        /**
         * Create a UUID. Code taken from: https://stackoverflow.com/a/2117523/1059979
         */
        JMap.prototype.uuidv4 = function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0,
                    v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        return JMap;
    });