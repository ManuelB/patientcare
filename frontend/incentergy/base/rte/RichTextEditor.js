sap.ui.define([ "sap/ui/core/Control", "./tinymce/tinymce.min"], function(Control, tinymce) {
	"use strict";
	return Control.extend("incentergy.base.rte.RichTextEditor", {
		metadata : {
			properties: {
				/**
				 * Determines the Panel width.
				 */
				width: {type: "sap.ui.core.CSSSize", group: "Appearance", defaultValue: "100%"},

				/**
				 * Determines the Panel height.
				 */
				height: {type: "sap.ui.core.CSSSize", group: "Appearance", defaultValue: "auto"},
				"content": {
					type: "string"
				},
				"plugins": {
					type: "string",
					defaultValue: "advlist autosave codesample emoticons hr insertdatetime media paste save table toc anchor bbcode colorpicker"+
					" fullpage image legacyoutput nonbreaking preview searchreplace template visualblocks autolink charmap contextmenu "+
					" imagetools link noneditable print textcolor visualchars code directionality help importcss lists"+
					" pagebreak quickbars tabfocus textpattern wordcount" /*Do not work: fullscreen spellchecker autoresize */
				}
			}
		},
		init : function() {
		},
		renderer : function(oRm, oControl) {
			oRm.write("<div");
			oRm.writeControlData(oControl);
			oRm.writeClasses();
			oRm.addStyle("width", oControl.getWidth());
			oRm.addStyle("height", oControl.getHeight());
			oRm.writeStyles();
			oRm.write(">");
			oRm.write("</div>");
		},
		onAfterRendering: function(oEvent) {
			var oControl = this;
			tinyMCE.init({ 
				selector: '#'+this.getId(),
				height: this.getHeight(),
				width: this.getWidth(), 
				plugins: this.getPlugins(),
				base_url: jQuery.sap.getModulePath("incentergy.base.rte")+"/tinymce",
				suffix: '.min',
				init_instance_callback: function (editor) {
					oControl._editor = editor;
					editor.on('Change', function (e) {
						oControl.setContent(editor.getContent(), true);
					});
				}
		  });
		},
		setContent: function (sContent, bSuppressEditorSet) {
			if(this._editor && !bSuppressEditorSet) {
				this._editor.setContent(sContent);
			}
			this.setProperty("content", sContent, true);
		}
	});
}, /* bExport= */false);