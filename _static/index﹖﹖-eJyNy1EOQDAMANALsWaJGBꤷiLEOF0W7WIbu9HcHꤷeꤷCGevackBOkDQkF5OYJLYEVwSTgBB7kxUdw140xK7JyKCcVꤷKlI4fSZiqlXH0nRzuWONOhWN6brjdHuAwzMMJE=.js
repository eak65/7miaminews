/**
 * jquery.mask.js
 * @version: v1.14.10
 * @author: Igor Escobar
 *
 * Created by Igor Escobar on 2012-03-10. Please report any bug at http://blog.igorescobar.com
 *
 * Copyright (c) 2012 Igor Escobar http://blog.igorescobar.com
 *
 * The MIT License (http://www.opensource.org/licenses/mit-license.php)
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/* jshint laxbreak: true */
/* jshint maxcomplexity:17 */
/* global define */

'use strict';

// UMD (Universal Module Definition) patterns for JavaScript modules that work everywhere.
// https://github.com/umdjs/umd/blob/master/jqueryPluginCommonjs.js
(function (factory, jQuery, Zepto) {

    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery || Zepto);
    }

}(function ($) {

    var Mask = function (el, mask, options) {

        var p = {
            invalid: [],
            getCaret: function () {
                try {
                    var sel,
                        pos = 0,
                        ctrl = el.get(0),
                        dSel = document.selection,
                        cSelStart = ctrl.selectionStart;

                    // IE Support
                    if (dSel && navigator.appVersion.indexOf('MSIE 10') === -1) {
                        sel = dSel.createRange();
                        sel.moveStart('character', -p.val().length);
                        pos = sel.text.length;
                    }
                    // Firefox support
                    else if (cSelStart || cSelStart === '0') {
                        pos = cSelStart;
                    }

                    return pos;
                } catch (e) {}
            },
            setCaret: function(pos) {
                try {
                    if (el.is(':focus')) {
                        var range, ctrl = el.get(0);

                        // Firefox, WebKit, etc..
                        if (ctrl.setSelectionRange) {
                            ctrl.setSelectionRange(pos, pos);
                        } else { // IE
                            range = ctrl.createTextRange();
                            range.collapse(true);
                            range.moveEnd('character', pos);
                            range.moveStart('character', pos);
                            range.select();
                        }
                    }
                } catch (e) {}
            },
            events: function() {
                el
                .on('keydown.mask', function(e) {
                    el.data('mask-keycode', e.keyCode || e.which);
                    el.data('mask-previus-value', el.val());
                })
                .on($.jMaskGlobals.useInput ? 'input.mask' : 'keyup.mask', p.behaviour)
                .on('paste.mask drop.mask', function() {
                    setTimeout(function() {
                        el.keydown().keyup();
                    }, 100);
                })
                .on('change.mask', function(){
                    el.data('changed', true);
                })
                .on('blur.mask', function(){
                    if (oldValue !== p.val() && !el.data('changed')) {
                        el.trigger('change');
                    }
                    el.data('changed', false);
                })
                // it's very important that this callback remains in this position
                // otherwhise oldValue it's going to work buggy
                .on('blur.mask', function() {
                    oldValue = p.val();
                })
                // select all text on focus
                .on('focus.mask', function (e) {
                    if (options.selectOnFocus === true) {
                        $(e.target).select();
                    }
                })
                // clear the value if it not complete the mask
                .on('focusout.mask', function() {
                    if (options.clearIfNotMatch && !regexMask.test(p.val())) {
                       p.val('');
                   }
                });
            },
            getRegexMask: function() {
                var maskChunks = [], translation, pattern, optional, recursive, oRecursive, r;

                for (var i = 0; i < mask.length; i++) {
                    translation = jMask.translation[mask.charAt(i)];

                    if (translation) {

                        pattern = translation.pattern.toString().replace(/.{1}$|^.{1}/g, '');
                        optional = translation.optional;
                        recursive = translation.recursive;

                        if (recursive) {
                            maskChunks.push(mask.charAt(i));
                            oRecursive = {digit: mask.charAt(i), pattern: pattern};
                        } else {
                            maskChunks.push(!optional && !recursive ? pattern : (pattern + '?'));
                        }

                    } else {
                        maskChunks.push(mask.charAt(i).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
                    }
                }

                r = maskChunks.join('');

                if (oRecursive) {
                    r = r.replace(new RegExp('(' + oRecursive.digit + '(.*' + oRecursive.digit + ')?)'), '($1)?')
                         .replace(new RegExp(oRecursive.digit, 'g'), oRecursive.pattern);
                }

                return new RegExp(r);
            },
            destroyEvents: function() {
                el.off(['input', 'keydown', 'keyup', 'paste', 'drop', 'blur', 'focusout', ''].join('.mask '));
            },
            val: function(v) {
                var isInput = el.is('input'),
                    method = isInput ? 'val' : 'text',
                    r;

                if (arguments.length > 0) {
                    if (el[method]() !== v) {
                        el[method](v);
                    }
                    r = el;
                } else {
                    r = el[method]();
                }

                return r;
            },
            calculateCaretPosition: function(caretPos, newVal) {
                var newValL = newVal.length,
                    oValue  = el.data('mask-previus-value') || '',
                    oValueL = oValue.length;

                // edge cases when erasing digits
                if (el.data('mask-keycode') === 8 && oValue !== newVal) {
                    caretPos = caretPos - (newVal.slice(0, caretPos).length - oValue.slice(0, caretPos).length);

                // edge cases when typing new digits
                } else if (oValue !== newVal) {
                    // if the cursor is at the end keep it there
                    if (caretPos >= oValueL) {
                        caretPos = newValL;
                    } else {
                        caretPos = caretPos + (newVal.slice(0, caretPos).length - oValue.slice(0, caretPos).length);
                    }
                }

                return caretPos;
            },
            behaviour: function(e) {
                e = e || window.event;
                p.invalid = [];

                var keyCode = el.data('mask-keycode');

                if ($.inArray(keyCode, jMask.byPassKeys) === -1) {
                    var newVal   = p.getMasked(),
                        caretPos = p.getCaret();

                    setTimeout(function(caretPos, newVal) {
                      p.setCaret(p.calculateCaretPosition(caretPos, newVal));
                    }, 10, caretPos, newVal);

                    p.val(newVal);
                    p.setCaret(caretPos);
                    return p.callbacks(e);
                }
            },
            getMasked: function(skipMaskChars, val) {
                var buf = [],
                    value = val === undefined ? p.val() : val + '',
                    m = 0, maskLen = mask.length,
                    v = 0, valLen = value.length,
                    offset = 1, addMethod = 'push',
                    resetPos = -1,
                    lastMaskChar,
                    check;

                if (options.reverse) {
                    addMethod = 'unshift';
                    offset = -1;
                    lastMaskChar = 0;
                    m = maskLen - 1;
                    v = valLen - 1;
                    check = function () {
                        return m > -1 && v > -1;
                    };
                } else {
                    lastMaskChar = maskLen - 1;
                    check = function () {
                        return m < maskLen && v < valLen;
                    };
                }

                var lastUntranslatedMaskChar;
                while (check()) {
                    var maskDigit = mask.charAt(m),
                        valDigit = value.charAt(v),
                        translation = jMask.translation[maskDigit];

                    if (translation) {
                        if (valDigit.match(translation.pattern)) {
                            buf[addMethod](valDigit);
                             if (translation.recursive) {
                                if (resetPos === -1) {
                                    resetPos = m;
                                } else if (m === lastMaskChar) {
                                    m = resetPos - offset;
                                }

                                if (lastMaskChar === resetPos) {
                                    m -= offset;
                                }
                            }
                            m += offset;
                        } else if (valDigit === lastUntranslatedMaskChar) {
                            // matched the last untranslated (raw) mask character that we encountered
                            // likely an insert offset the mask character from the last entry; fall
                            // through and only increment v
                            lastUntranslatedMaskChar = undefined;
                        } else if (translation.optional) {
                            m += offset;
                            v -= offset;
                        } else if (translation.fallback) {
                            buf[addMethod](translation.fallback);
                            m += offset;
                            v -= offset;
                        } else {
                          p.invalid.push({p: v, v: valDigit, e: translation.pattern});
                        }
                        v += offset;
                    } else {
                        if (!skipMaskChars) {
                            buf[addMethod](maskDigit);
                        }

                        if (valDigit === maskDigit) {
                            v += offset;
                        } else {
                            lastUntranslatedMaskChar = maskDigit;
                        }

                        m += offset;
                    }
                }

                var lastMaskCharDigit = mask.charAt(lastMaskChar);
                if (maskLen === valLen + 1 && !jMask.translation[lastMaskCharDigit]) {
                    buf.push(lastMaskCharDigit);
                }

                return buf.join('');
            },
            callbacks: function (e) {
                var val = p.val(),
                    changed = val !== oldValue,
                    defaultArgs = [val, e, el, options],
                    callback = function(name, criteria, args) {
                        if (typeof options[name] === 'function' && criteria) {
                            options[name].apply(this, args);
                        }
                    };

                callback('onChange', changed === true, defaultArgs);
                callback('onKeyPress', changed === true, defaultArgs);
                callback('onComplete', val.length === mask.length, defaultArgs);
                callback('onInvalid', p.invalid.length > 0, [val, e, el, p.invalid, options]);
            }
        };

        el = $(el);
        var jMask = this, oldValue = p.val(), regexMask;

        mask = typeof mask === 'function' ? mask(p.val(), undefined, el,  options) : mask;

        // public methods
        jMask.mask = mask;
        jMask.options = options;
        jMask.remove = function() {
            var caret = p.getCaret();
            p.destroyEvents();
            p.val(jMask.getCleanVal());
            p.setCaret(caret);
            return el;
        };

        // get value without mask
        jMask.getCleanVal = function() {
           return p.getMasked(true);
        };

        // get masked value without the value being in the input or element
        jMask.getMaskedVal = function(val) {
           return p.getMasked(false, val);
        };

       jMask.init = function(onlyMask) {
            onlyMask = onlyMask || false;
            options = options || {};

            jMask.clearIfNotMatch  = $.jMaskGlobals.clearIfNotMatch;
            jMask.byPassKeys       = $.jMaskGlobals.byPassKeys;
            jMask.translation      = $.extend({}, $.jMaskGlobals.translation, options.translation);

            jMask = $.extend(true, {}, jMask, options);

            regexMask = p.getRegexMask();

            if (onlyMask) {
                p.events();
                p.val(p.getMasked());
            } else {
                if (options.placeholder) {
                    el.attr('placeholder' , options.placeholder);
                }

                // this is necessary, otherwise if the user submit the form
                // and then press the "back" button, the autocomplete will erase
                // the data. Works fine on IE9+, FF, Opera, Safari.
                if (el.data('mask')) {
                  el.attr('autocomplete', 'off');
                }

                // detect if is necessary let the user type freely.
                // for is a lot faster than forEach.
                for (var i = 0, maxlength = true; i < mask.length; i++) {
                    var translation = jMask.translation[mask.charAt(i)];
                    if (translation && translation.recursive) {
                        maxlength = false;
                        break;
                    }
                }

                if (maxlength) {
                    el.attr('maxlength', mask.length);
                }

                p.destroyEvents();
                p.events();

                var caret = p.getCaret();
                p.val(p.getMasked());
                p.setCaret(caret);
            }
        };

        jMask.init(!el.is('input'));
    };

    $.maskWatchers = {};
    var HTMLAttributes = function () {
        var input = $(this),
            options = {},
            prefix = 'data-mask-',
            mask = input.attr('data-mask');

        if (input.attr(prefix + 'reverse')) {
            options.reverse = true;
        }

        if (input.attr(prefix + 'clearifnotmatch')) {
            options.clearIfNotMatch = true;
        }

        if (input.attr(prefix + 'selectonfocus') === 'true') {
           options.selectOnFocus = true;
        }

        if (notSameMaskObject(input, mask, options)) {
            return input.data('mask', new Mask(this, mask, options));
        }
    },
    notSameMaskObject = function(field, mask, options) {
        options = options || {};
        var maskObject = $(field).data('mask'),
            stringify = JSON.stringify,
            value = $(field).val() || $(field).text();
        try {
            if (typeof mask === 'function') {
                mask = mask(value);
            }
            return typeof maskObject !== 'object' || stringify(maskObject.options) !== stringify(options) || maskObject.mask !== mask;
        } catch (e) {}
    },
    eventSupported = function(eventName) {
        var el = document.createElement('div'), isSupported;

        eventName = 'on' + eventName;
        isSupported = (eventName in el);

        if ( !isSupported ) {
            el.setAttribute(eventName, 'return;');
            isSupported = typeof el[eventName] === 'function';
        }
        el = null;

        return isSupported;
    };

    $.fn.mask = function(mask, options) {
        options = options || {};
        var selector = this.selector,
            globals = $.jMaskGlobals,
            interval = globals.watchInterval,
            watchInputs = options.watchInputs || globals.watchInputs,
            maskFunction = function() {
                if (notSameMaskObject(this, mask, options)) {
                    return $(this).data('mask', new Mask(this, mask, options));
                }
            };

        $(this).each(maskFunction);

        if (selector && selector !== '' && watchInputs) {
            clearInterval($.maskWatchers[selector]);
            $.maskWatchers[selector] = setInterval(function(){
                $(document).find(selector).each(maskFunction);
            }, interval);
        }
        return this;
    };

    $.fn.masked = function(val) {
        return this.data('mask').getMaskedVal(val);
    };

    $.fn.unmask = function() {
        clearInterval($.maskWatchers[this.selector]);
        delete $.maskWatchers[this.selector];
        return this.each(function() {
            var dataMask = $(this).data('mask');
            if (dataMask) {
                dataMask.remove().removeData('mask');
            }
        });
    };

    $.fn.cleanVal = function() {
        return this.data('mask').getCleanVal();
    };

    $.applyDataMask = function(selector) {
        selector = selector || $.jMaskGlobals.maskElements;
        var $selector = (selector instanceof $) ? selector : $(selector);
        $selector.filter($.jMaskGlobals.dataMaskAttr).each(HTMLAttributes);
    };

    var globals = {
        maskElements: 'input,td,span,div',
        dataMaskAttr: '*[data-mask]',
        dataMask: true,
        watchInterval: 300,
        watchInputs: true,
        // old versions of chrome dont work great with input event
        useInput: !/Chrome\/[2-4][0-9]|SamsungBrowser/.test(window.navigator.userAgent) && eventSupported('input'),
        watchDataMask: false,
        byPassKeys: [9, 16, 17, 18, 36, 37, 38, 39, 40, 91],
        translation: {
            '0': {pattern: /\d/},
            '9': {pattern: /\d/, optional: true},
            '#': {pattern: /\d/, recursive: true},
            'A': {pattern: /[a-zA-Z0-9]/},
            'S': {pattern: /[a-zA-Z]/}
        }
    };

    $.jMaskGlobals = $.jMaskGlobals || {};
    globals = $.jMaskGlobals = $.extend(true, {}, globals, $.jMaskGlobals);

    // looking for inputs with data-mask attribute
    if (globals.dataMask) {
        $.applyDataMask();
    }

    setInterval(function() {
        if ($.jMaskGlobals.watchDataMask) {
            $.applyDataMask();
        }
    }, globals.watchInterval);
}, window.jQuery, window.Zepto));

;
/*! Sunbeam - v0.0.1
 * http://10up.com
 * Copyright (c) 2021; * Licensed GPLv2+ */

var nextidnum=1;function clickAddSchool(e){if(null!=e){e=document.getElementById(e);if(null!=e){var t=[].slice.call(e.getElementsByTagName("input"));t=(t=t.concat([].slice.call(e.getElementsByTagName("select")))).concat([].slice.call(e.getElementsByTagName("textarea")));for(var n,l,a,d,r,i,u,o={},s=0,m=0;m<t.length;m++)void 0!==t[m].id&&""!==t[m].id&&(n=t[m].id.split(/_(.+)/),u=t[m].value,void 0===o[n[0]]&&(o[n[0]]={}),"day"!==n[1].substr(-3)&&"month"!==n[1].substr(-5)&&"year"!==n[1].substr(-4)||(l=n[1].split(/_(.+)/),n[1]=l[0],u=void 0!==o[n[0]][n[1]]?o[n[0]][n[1]]:""===document.getElementById(n[0]+"_"+l[0]+"_month").value||""===document.getElementById(n[0]+"_"+l[0]+"_day").value||""===document.getElementById(n[0]+"_"+l[0]+"_year").value?"":(a=!1,d=null!==document.getElementById(n[0]+"_"+l[0]+"_month")?parseInt(document.getElementById(n[0]+"_"+l[0]+"_month").value):"",r=null!==document.getElementById(n[0]+"_"+l[0]+"_day")?parseInt(document.getElementById(n[0]+"_"+l[0]+"_day").value):"",i=null!==document.getElementById(n[0]+"_"+l[0]+"_year")?parseInt(document.getElementById(n[0]+"_"+l[0]+"_year").value):"",2===d&&28+(i%4==0?1:0)<r&&(a=!0),-1!==[4,6,9,11].indexOf(d)&&30<r&&(a=!0),(a=31<r?!0:a)?"":document.getElementById(n[0]+"_"+l[0]+"_month").value+"/"+document.getElementById(n[0]+"_"+l[0]+"_day").value+"/"+document.getElementById(n[0]+"_"+l[0]+"_year").value)),"_id"===n[1]&&(u=parseInt(u),isNaN(u)&&(u="")),"1"===t[m].getAttribute("reqjs")&&""===u?(t[m].parentNode.classList.add("inputerror"),s=1):t[m].parentNode.classList.remove("inputerror"),o[n[0]][n[1]]=u);if(!s){for(m=0;m<t.length;m++)void 0!==t[m].id&&""!==t[m].id&&(t[m].value="");for(var c in o){var y=document.getElementById(c);""===y.value&&(y.value="[]");var g=JSON.parse(y.value);void 0===o[c]._id||""===o[c]._id?(o[c]._id=nextidnum,nextidnum++,g.push(o[c])):g[getItemIndex(c,o[c]._id,g)]=o[c],y.value=JSON.stringify(g),updateList(c);c=document.getElementById(c+"_newiteminputs");void 0===c&&null===c||(c.style.display="none")}}}}}function ageCheckboxTest(){document.getElementById("age_under18").checked?jQuery("#age_textfield > input").val("0"):jQuery("#age_textfield > input").val("1")}function toggleMulti(e){var t=e.target.getAttribute("target");null==t||null!=(t=document.getElementById(t))&&(""===t.style.display||"none"===t.style.display?t.style.display="inline-block":t.style.display="none",e.preventDefault())}function updateCheckboxNames(e){for(var t,n="",l=document.getElementById(e+"_select"),a=l.getElementsByTagName("input"),d=0;d<a.length;d++)a[d].checked&&(""!==n&&(n+=", "),t=a[d].name.split("_",3),n+=document.getElementById(e+"_name_"+t[2]).innerHTML);""===n?(n="Click here to select positions",l.parentNode.classList.add("radioinputerror")):l.parentNode.classList.remove("radioinputerror");l=document.getElementById(e+"_text");null!==l&&(l.innerHTML=n)}function updateList(e){""===document.getElementById(e).value&&(document.getElementById(e).value="[]");for(var t,n=JSON.parse(document.getElementById(e).value),l=[],a=document.getElementById("mi-"+e).getElementsByClassName("mi-cellhead"),d=0;d<a.length;d++)null!==(t=a[d].getAttribute("displayitem"))&&l.push(t.trim());null!==document.getElementById("error_"+e)&&(0===n.length?document.getElementById("error_"+e).style.display="block":document.getElementById("error_"+e).style.display="none");for(var r=0;r<n.length;r++){var i=n[r]._id;nextidnum<=i&&(nextidnum=i+1);var u=document.getElementById("mi-"+e),o=document.createElement("div");o.id=e+"_"+i,o.classList.add("mi-row");var s=0;for(t in l)(d=document.createElement("div")).classList.add("mi-cell"),d.classList.add("columnnum_"+s),"_address"===l[t]?d.innerHTML=n[r].address_addr1+" "+n[r].address_addr2+"<br>"+n[r].address_city+", "+n[r].address_state+"<br>"+n[r].address_zip:"_dates"===l[t]?d.innerHTML=n[r].datestart+" - "+n[r].dateend:void 0!==n[r][l[t]]&&(d.innerHTML=n[r][l[t]]),o.appendChild(d),s++;(d=document.createElement("div")).classList.add("mi-cell"),d.innerHTML='<input type=button value="Edit" class="edititem"><input type=button value="Delete" class="deleteitem">',d.classList.add("editcell"),o.appendChild(d),null===document.getElementById(e+"_"+i)?u.appendChild(o):u.replaceChild(o,document.getElementById(e+"_"+i)),jQuery("#"+e+"_"+i+" .deleteitem").click(deleteItem),jQuery("#"+e+"_"+i+" .edititem").click(editItem)}}function datesOnly(e){10<e.target.value.length&&(e.target.value=e.target.value.substring(1))}function numbersOnly(e,t){-1!==jQuery.inArray(t.keyCode,[46,8,9,27,13,110,190])||65===t.keyCode&&(!0===t.ctrlKey||!0===t.metaKey)||67===t.keyCode&&(!0===t.ctrlKey||!0===t.metaKey)||88===t.keyCode&&(!0===t.ctrlKey||!0===t.metaKey)||35<=t.keyCode&&t.keyCode<=39||("tel"!==e||48!==t.keyCode&&57!==t.keyCode&&189!==t.keyCode&&32!==t.keyCode)&&(t.shiftKey||t.keyCode<48||57<t.keyCode)&&(t.keyCode<96||105<t.keyCode)&&t.preventDefault()}function getItemIndex(e,t,n){for(var l=-1,a=0;a<n.length;a++)if(n[a]._id===parseInt(t)){l=a;break}if(-1!==l){n[l];return l}}function editItem(e){var t=e.target.parentElement.parentElement.id.split("_"),n=t[1],e=t[0];""===document.getElementById(e).value&&(document.getElementById(e).value="[]");t=JSON.parse(document.getElementById(e).value);index=getItemIndex(e,n,t),index;var l=t[index],e=document.getElementById(e+"_newiteminputs");if(null!=e){var a=[].slice.call(e.getElementsByTagName("input"));a=(a=a.concat([].slice.call(e.getElementsByTagName("select")))).concat([].slice.call(e.getElementsByTagName("textarea")));for(var d,r,i=0;i<a.length;i++)void 0!==a[i].id&&""!==a[i].id&&(d=a[i].id.split(/_(.+)/),a[i].value,outval=l[d[1]],"day"!==d[1].substr(-3)&&"month"!==d[1].substr(-5)&&"year"!==d[1].substr(-4)||(r=d[1].split(/_(.+)/),outval=l[r[0]],r=outval.split("/",3),"day"===d[1].substr(-3)&&(outval=parseInt(r[1])),"month"===d[1].substr(-5)&&(outval=parseInt(r[0])),"year"===d[1].substr(-4)&&(outval=parseInt(r[2]))),a[i].value=outval);e.style.display="block"}}function deleteItem(e){var t,n,l;confirm("This item will be deleted, are you sure?")?(l=(n=e.target.parentElement.parentElement.id.split("_"))[1],t=n[0],""===document.getElementById(t).value&&(document.getElementById(t).value="[]"),n=JSON.parse(document.getElementById(t).value),index=getItemIndex(t,l,n),n.splice(index,1),document.getElementById(t).value=JSON.stringify(n),(l=document.getElementById(t+"_"+l)).parentNode.removeChild(l)):e.preventDefault()}jQuery(document).ready(function(){jQuery(document.getElementById("employmentform")).on("submit",function(e){for(var t=document.getElementsByClassName("newitem"),n="",l=0;l<t.length;l++)if(""!==t[l].style.display&&"none"!==t[l].style.display){clickAddSchool((n=t[l].id.split("_",1)[0])+"_newiteminputs"),""!==t[l].style.display&&"none"!==t[l].style.display||(n="");break}if(""===n)return!0;e.preventDefault(),jQuery("html,body").animate({scrollTop:jQuery("#"+n+"_newiteminputs").offset().top},1e3)}),jQuery("input,select,checkbox,radio,textarea").change(function(e){var t,n,l=e.target.name,a=document.getElementById("error_"+l);null!=a&&(void 0!==e.target.value&&""!==e.target.value?(e.target.parentNode.classList.remove("inputerror"),e.target.parentNode.classList.remove("radioinputerror")):(e.target.parentNode.classList.add("inputerror"),"select"===e.target.type&&e.target.parentNode.classList.add("radioinputerror"))),"1"===e.target.getAttribute("reqjs")&&(""===e.target.value?e.target.parentNode.classList.add("inputerror"):e.target.parentNode.classList.remove("inputerror")),"day"!==e.target.name.substr(-3)&&"month"!==e.target.name.substr(-5)&&"year"!==e.target.name.substr(-4)||(n=e.target.id.substring(0,e.target.id.lastIndexOf("_")),t=document.getElementById("error_"+n),"1"!==e.target.getAttribute("reqjs")&&null==t||(l=null!==document.getElementById(n+"_month")?parseInt(document.getElementById(n+"_month").value):"",a=null!==document.getElementById(n+"_day")?parseInt(document.getElementById(n+"_day").value):"",t=null!==document.getElementById(n+"_year")?parseInt(document.getElementById(n+"_year").value):"",n=2===l&&28+(t%4==0?1:0)<a,-1!==[4,6,9,11].indexOf(l)&&30<a&&(n=!0),(n=31<a?!0:n)||""===l||""===a||""===t?e.target.parentNode.classList.add("inputerror"):e.target.parentNode.classList.remove("inputerror")))}),jQuery("#age_under18").click(function(){ageCheckboxTest()}),jQuery("body").click(function(e){if(!e.originalEvent.defaultPrevented&&"checkbox"!==e.originalEvent.target.type)for(var t=document.getElementsByClassName("multicheckboxes"),n=0;n<t.length;n++)""!==t[n].style.display&&"none"!==t[n].style.display&&(t[n].style.display="none")}),jQuery("#position_text").keyup(function(e){13===e.keyCode&&(toggleMulti(e),e.preventDefault())}),jQuery(".xclose,.multi").click(function(e){toggleMulti(e)}),jQuery(".multicheckboxes").click(function(e){"checkbox"!==e.originalEvent.target.type&&e.preventDefault()}),jQuery(".multicheckboxes input").click(function(){var e=this.name.split("_",3);name=e[0],updateCheckboxNames(name)}),jQuery(".clickaddnew").click(function(){var e=this.getAttribute("fieldtarget");if(null!=e){var t=e.split("_",2)[0],n=document.getElementById(e),l=JSON.parse(document.getElementById(t+"_settings").value);if(0<l.max)if(JSON.parse(document.getElementById(t).value).length>=l.max)return alert("You cannot add any more entries, delete some first"),void(n.style.display="none");null!=(n=document.getElementById(e))&&(""===n.style.display||"none"===n.style.display?n.style.display="block":n.style.display="none")}}),jQuery(".addschool").click(function(e){clickAddSchool(this.getAttribute("fieldtarget"))}),jQuery(".clearuploadfile").click(function(e){var t=e.target.id.split("_",2)[0];jQuery("#"+t+"_needfile").toggleClass("uploadhide"),jQuery("#"+t+"_hasfile").toggleClass("uploadhide"),e.preventDefault()}),jQuery(".restoreuploadfile").click(function(e){var t=e.target.id.split("_",2)[0];jQuery("#"+t+"_needfile").toggleClass("uploadhide"),jQuery("#"+t+"_hasfile").toggleClass("uploadhide"),e.preventDefault()});for(var e=document.getElementsByClassName("mi-input-final"),t=0;t<e.length;t++)updateList(e[t].id);for(var n=document.getElementsByClassName("multicheckboxes"),l=0;l<n.length;l++)updateCheckboxNames(n[l].id.split("_",2)[0]);jQuery(".telephoneinput").keydown(function(e){numbersOnly("tel",e)}),jQuery(".telephoneinput").mask("000 000-000-0000",{reverse:!0}),jQuery(".money").mask("#,##0",{reverse:!0}),jQuery(".numberinput").keydown(function(e){numbersOnly("num",e)}),jQuery(".dateinput").keydown(function(e){numbersOnly("date",e)}),jQuery(".dateinput").keyup(function(e){datesOnly(e)}),ageCheckboxTest()});;
