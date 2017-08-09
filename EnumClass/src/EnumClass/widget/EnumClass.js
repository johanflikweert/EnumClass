define([
	"dojo/_base/declare",
  "mxui/widget/_WidgetBase",
  'dojo/_base/lang',
  "dojo/dom-construct",
  "dojo/dom-attr",
  "dojo/dom-class"
], function (declare, _WidgetBase, lang, domConstruct, domAttr, domClass) {
	"use strict";

	// Declare widget"s prototype.
	return declare("EnumClass.widget.EnumClass", [_WidgetBase], {

    // Set in Modeler
    name : "",
    enumvalues : [], //value array, keep it compatible with mx4
    glyphicon: "",
    applyToEnum: "",
    associationClassName: "",

    // internal variables
    contextGUID : null,
    caption : [],
    classnames : [],
    replacements : [],
    curindex : 0,
    element : null,
    attrHandle: null,
    objHandle: null,
    defaultClass: "",
    elementToApplyTo: null,
	showWidget: true,
	referenceEntity: null,
	_referenceName: null,
	attributeType: "primitive",

    postCreate : function () {

		//Polyfill so we can use element.closest in IE
		// matches polyfill
		window.Element && function(ElementPrototype) {
		    ElementPrototype.matches = ElementPrototype.matches ||
		    ElementPrototype.matchesSelector ||
		    ElementPrototype.webkitMatchesSelector ||
		    ElementPrototype.msMatchesSelector ||
		    function(selector) {
		        var node = this, nodes = (node.parentNode || node.document).querySelectorAll(selector), i = -1;
		        while (nodes[++i] && nodes[i] != node);
		        return !!nodes[i];
		    }
		}(Element.prototype);

		// closest polyfill
		window.Element && function(ElementPrototype) {
		    ElementPrototype.closest = ElementPrototype.closest ||
		    function(selector) {
		        var el = this;
		        while (el.matches && !el.matches(selector)) el = el.parentNode;
		        return el.matches ? el : null;
		    }
		}(Element.prototype);

		//End polyfill

    // STYLE BY REFERENCE
		if (this.referenceEntity) {
			this._referenceName = this.referenceEntity.split("/")[0];
		}

		this.caption = [];
		this.classnames = [];
		this.replacements = [];
		// copy data from object array
		for (var i = 0; i < this.enumvalues.length; i++) {
			this.caption.push(this.enumvalues[i].captions);
			this.classnames.push(this.enumvalues[i].classnames);
			this.replacements.push(this.enumvalues[i].replacements);
		}

		this.element = domConstruct.create("span");
		this.domNode.appendChild(this.element);

		if (!this.showWidget) {
			domAttr.set(this.element, "style", "display:none;");
		}

		switch (this.applyToEnum) { //Select the right element to apply the class too
		case "SELF":
			this.elementToApplyTo = this.element;
			break;
		case "ROW":
			this.elementToApplyTo = this.element.closest(".mx-templategrid-row");
			break;
		case "ITEM":
			this.elementToApplyTo = this.element.closest(".mx-listview-item");
			break;
		case "PARENT":
			this.elementToApplyTo = this.domNode.parentElement;
			break;
		case "SIBLING":
			this.elementToApplyTo = this.domNode.previousSibling;
			break;
		default:
			this.elementToApplyTo = this.element;
		}
		//ET 12/7/16 -- Removed in favor of the dom-class module so two EnumClass widgets can peacefully coexist
		//this.defaultClass = domAttr.get(this.elementToApplyTo, "class");

		//if (this.defaultClass !== "") {
		//	this.defaultClass += " ";
		//}
    },

    update : function (obj, callback) {
      if (obj) {
        this.contextGUID = obj.getGuid();
        // check reference
        if (this._referenceName && obj.get(this._referenceName) !== ""){
          // console.log(obj.get(this._referenceName))
          // set the classes
          //this.elementToApplyTo.className += " " + this.associationClassName
		  domClass.add(this.elementToApplyTo, this.associationClassName);
	  } else {
		  domClass.remove(this.elementToApplyTo, this.associationClassName);
	  }
        this._resetSubscriptions();
      }
      callback();
    },

    _setValueAttr : function (value) {
		if(this.attributeType == "reference") {
			if(value) {
				value = "true";
			} else {
				value = "false";
			}
		}

		if(value === true) {
        	value = "true";
        } else if (value === false) {
        	value = "false";
        }

		var i = this.caption.indexOf(value);
		var classname = "";
		var toDisplay = "";

		if ((i >= 0) && (i < this.caption.length)) {
			this.curindex = i;
			classname = this.classnames[i];
		} else {
			this.curindex = 0;
			classname = "";
		}

		if (this.replacements[i] !== "" && typeof this.replacements[i] !== "undefined") {
			toDisplay = this.replacements[i];
		} else {
			toDisplay = value;
		}

		if (this.glyphicon !== "") {
			classname = classname + " glyphicon glyphicon-" + this.glyphicon + " ";
		}
		//domAttr.set(this.elementToApplyTo, "class", this.defaultClass + classname); //Set the class to the existing class + enum-determined-class
		for (var i = 0; i < this.classnames.length; i++) {
			if(classname !== this.classnames[i]) {
				domClass.remove(this.elementToApplyTo, this.classnames[i]);
			}
		}
		domClass.add(this.elementToApplyTo, classname);

		if (this.glyphicon !== "") {
			domAttr.set(this.element, "innerHTML", "");
			domAttr.set(this.element, "title", toDisplay); //Set innerHTML empty and tooltip to caption
		} else {
			domAttr.set(this.element, "innerHTML", toDisplay); //Set the innerHTML to the value of the attribute
		}
    },

    _getValueAttr : function (value) {
      return this.caption[this.curindex];
    },

    //stub function, will be used or replaced by the client environment
    onChange : function () {},

    textChange : function (e) {
      this.onChange();
    },

    _unsubscribe: function () {
      if (this.attrHandle) {
        mx.data.unsubscribe(this.attrHandle);
      }
	  if (this.objHandle) {
		mx.data.unsubscribe(this.objHandle);
	  }
    },

    _resetSubscriptions : function () {
		var attributeName = this.name;
		if(this.attributeType == "reference") {
			attributeName = this._referenceName;
		}

		if (this.contextGUID) {
			this._unsubscribe();
			this.attrHandle = this.subscribe({
			  guid : this.contextGUID,
			  attr : this.name,
			  callback : lang.hitch(this, function (guid, attr, attrValue) {
			    this._setValueAttr(attrValue);
			  })
			});
		}
    },

    uninitialize: function () {
      this._unsubscribe();
    }

	});
});

require(["EnumClass/widget/EnumClass"], function () {
    "use strict";
});
