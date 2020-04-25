sap.ui.define(
    [
        "pass/manager/model/OpenPGP",
        "sap/ui/thirdparty/sinon",
        "sap/ui/thirdparty/sinon-qunit"
    ],
    function(OpenPGP) {
        "use strict";
        QUnit.module("OpenPGP", {
            setup: function() {

            },
            teardown: function() {

            }
        });
        QUnit.test("OpenPGP encrypt decrypt", function(oAssert) {
            oAssert.expect(1);
            let fnDone = oAssert.async();
            let oOpenPGPModel = new OpenPGP();
            oOpenPGPModel.pInitWorker.then(() => {
                oOpenPGPModel.encrypt("Hallo Welt").then((sArmoredMessage) => {
                    console.log(sArmoredMessage);
                    oOpenPGPModel.decrypt(sArmoredMessage).then((sText) => {
                        oAssert.equal(sText, "Hallo Welt");
                        fnDone();
                    });
                });
            });
        });
    })