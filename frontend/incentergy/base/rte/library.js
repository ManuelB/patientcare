sap.ui.define([
	"sap/ui/core/Core",
	"sap/ui/core/library"
],function(Core, Library) {
	"use strict";

	sap.ui.getCore().initLibrary({
		name : "incentergy.base.rte",
		noLibraryCSS: true,
		dependencies : [
			"sap.ui.core"
		],
		types: [],
		interfaces: [],
		controls: ["incentergy.base.rte.RichTextEditor"],
		elements: [],
		version: "1.0.0"
	});

	return incentergy.base.rte;

}, /* bExport= */ false);