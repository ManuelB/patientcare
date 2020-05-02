sap.ui.define(["sap/m/MessageBox"],
    function(MessageBox) {
        const Onboarding = function(oComponent) {
            this.oComponent = oComponent;
            this.oOpenPGPModel = this.oComponent.getModel("OpenPGP");
            this.oJMapModel = this.oComponent.getModel("JMap");
            if (!this.onboarded()) {
                this.generateGPGKeyPair()
                    .then((mParams) => this.createMailAccount(mParams.email, mParams.sha256PrivateKeyHex))
                    .then(() => this.sendPublicKeySubmissionMail())
                    .then(() => window.localStorage.setItem("onboarded", new Date().toISOString()))
                    .catch((e) => {
                        this.oOpenPGPModel.clearSettings();
                        this.oJMapModel.clearSettings();
                        window.localStorage.removeItem("onboarded");
                        MessageBox.error("Error during onboarding:" + e, { "title": "Onboarding not successful" });
                    });
            }
        };

        Onboarding.prototype.onboarded = function() {
            return "onboarded" in window.localStorage;
        };

        Onboarding.prototype.generateGPGKeyPair = function() {
            return this.oOpenPGPModel.onNewKey();
        };

        Onboarding.prototype.createMailAccount = function(sMail, sPassword) {
            return this.oJMapModel.createMailAccount(sMail, sPassword);
        };

        Onboarding.prototype.sendPublicKeySubmissionMail = function() {
            return new Promise((fnResolve) => {
                this.oOpenPGPModel.receiveSubmissionAddress().then((sSubmissionAddress) => {
                    this.oOpenPGPModel.encryptPublicKeyForSubmission(sSubmissionAddress).then((oEncrypted) => {
                        this.oJMapModel.uploadBlob(oEncrypted.data, "application/pgp-encrypted").then((oBlobResponse) => {
                            this.oJMapModel.sendMail(sSubmissionAddress, "Key publishing request", "", undefined, [{ "blobId": oBlobResponse.blobId, "type": oBlobResponse.type, "size": oBlobResponse.size }]).then(() => {
                                fnResolve();
                            });
                        });
                    });
                });
            })
        };

        return Onboarding;
    });