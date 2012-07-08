// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function(){
  log.history = log.history || [];   // store logs to an array for reference
  log.history.push(arguments);
  if(this.console) {
    arguments.callee = arguments.callee.caller;
    var newarr = [].slice.call(arguments);
    (typeof console.log === 'object' ? log.apply.call(console.log, console, newarr) : console.log.apply(console, newarr));
  }
};

// make it safe to use console.log always
(function(b){function c(){}for(var d="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,timeStamp,profile,profileEnd,time,timeEnd,trace,warn".split(","),a;a=d.pop();){b[a]=b[a]||c}})((function(){try
{console.log();return window.console;}catch(err){return window.console={};}})());

// place any jQuery/helper plugins in here, instead of separate, slower script files.

(function($) {
  
  var defaults = {
    'swipeTolerance': 40
  };
  
  var touchStatus = function(target, touch) {
    this.target    = $(target);
    this.touch     = touch;
    this.startX    = this.currentX = touch.screenX;
    this.startY    = this.currentY = touch.screenY;
    this.eventType = null;
  }
  touchStatus.options = {};
  touchStatus.latestTap = null;

  touchStatus.prototype.move = function(touch) {
    this.currentX = touch.screenX;
    this.currentY = touch.screenY;
  }

  touchStatus.prototype.process = function() {
    var offsetX = this.currentX - this.startX;
    var offsetY = this.currentY - this.startY;
    if(offsetX == 0 && offsetY == 0) {
      this.checkForDoubleTap();
    } else if(Math.abs(offsetY) > touchStatus.options.swipeTolerance && Math.abs(offsetY) > Math.abs(offsetX)) {
      this.eventType = offsetY > 0 ? 'swipedown' : 'swipeup';
      this.target.trigger('swipe', [this])
    } else if(Math.abs(offsetX) > touchStatus.options.swipeTolerance) {
      this.eventType = offsetX > 0 ? 'swiperight' : 'swipeleft';
      this.target.trigger('swipe', [this])
    }
    if(this.eventType) this.target.trigger(this.eventType, [this])
    this.target.trigger('touch',        [this])
  }

  touchStatus.prototype.checkForDoubleTap = function() {
    if(touchStatus.latestTap) {
      if((new Date() - touchStatus.latestTap) < 400) 
        this.eventType = 'doubletap'
    }
    if(!this.eventType) this.eventType = 'tap'
    touchStatus.latestTap = new Date()
  }

  var swipeEvents = function(elements, options) {
    touchStatus.options = $.extend(defaults, options);
    elements.bind('touchstart',  this.touchStart);
    elements.bind('touchmove',   this.touchMove);
    elements.bind('touchcancel', this.touchCancel);
    elements.bind('touchend',    this.touchEnd);
  }

  swipeEvents.prototype.touchStart = function(evt) {
    var target = this;
    swipeEvents.eachTouch(evt, function(touch) {
      swipeEvents.touches[touch.identifier] = new touchStatus(target, touch);
    })
  }

  swipeEvents.prototype.touchMove = function(evt) {
    swipeEvents.eachTouch(evt, function(touch) {
      var loc = swipeEvents.touches[touch.identifier]
      if(loc) loc.move(touch)
    })
  }

  swipeEvents.prototype.touchCancel = function(evt) {
    swipeEvents.eachTouch(evt, function(touch) {
      swipeEvents.purge(touch, true)
    })
  }

  swipeEvents.prototype.touchEnd = function(evt) {
    swipeEvents.eachTouch(evt, function(touch) {
      swipeEvents.purge(touch)
    })
  }

  swipeEvents.touches = {}
  swipeEvents.purge = function(touch, cancelled) {
    if(!cancelled) {
      var loc = swipeEvents.touches[touch.identifier]
      if(loc) loc.process()
    }
    delete swipeEvents.touches[touch.identifier]
  }

  swipeEvents.eachTouch = function(evt, callback) {
    var evt = evt.originalEvent;
    var num = evt.changedTouches.length;
    for(var i = 0; i < num; i++) {
      callback(evt.changedTouches[i])
    }
  }

  // adds custom events:
  //   touch      // all events
  //   swipe      // only swipe* events
  //   swipeleft
  //   swiperight
  //   swipeup
  //   swipedown
  //   tap
  //   doubletap
  $.fn.addSwipeEvents = function(options, callback) { 
    if (!callback && jQuery.isFunction(options)) {
      callback = options;
      options = null;
    }
    new swipeEvents(this, options);
    if(callback) this.bind('touch', callback);
    return this;
  }
})(jQuery);


/*! idTabs v3.0 ~ Sean Catchpole - Copyright 2010 MIT/GPL */
;(function($){

/* Changes for 3.0
 - return removed (it was depreciated)
 - passing arguments changed (id,s,e)
 - refresh of code speed and accuracy
 - items now object instead of id's
 - multiple tabs can now point to same id
 - removed autoloading jQuery
 - added item classes support
 - toggle visibility
 - update or remove idTabs
 - grouped areas
 - extend idTabs
*/

/* Options (in any order):

 start (number|string)
    Index number of default tab. ex: $(...).idTabs(0)
    String of id of default tab. ex: $(...).idTabs("#tab1")
    default: class "selected" or index 0
    Passing -1 or null will force it to not select a default tab

 change (boolean)
    True - Url will change. ex: $(...).idTabs(true)
    False - Url will not change. ex: $(...).idTabs(false)
    default: false

 click (function)
    Function will be called when a tab is clicked. ex: $(...).idTabs(function(id,s){...})
    If the function returns false, idTabs will not take any action,
    otherwise idTabs will show/hide the content (as usual).
    The function is passed three variables:
      The id of the element to be shown
      The settings object which has the following additional items:
        area     - the original area $(area).idTabs();
        tabarea  - the current tab area used to find tabs
        tabs     - a jQuery list of tabs
        items    - a jQuery list of the elements the tabs point to
        tab(id)  - a helper function to find a tab with id
        item(id) - a helper function to find an item with id
      The event object that triggered idTabs

 selected (string)
    Class to use for selected. ex: $(...).idTabs(".current")
    default: ".selected"

 event (string)
    Event to trigger idTabs on. ex: $(...).idTabs("!mouseover")
    default: "!click"
    To bind multiple events, call idTabs multiple times
      ex: $(...).idTabs("!click").idTabs("!focus")

 toggle (boolean)
    True - Toggle visibility of tab content. ex: $(...).idTabs("!true")
    False - Ignore clicks on tabs already selected. ex: $(...).idTabs("!false")
    default: false

 grouped (boolean)
    True - Groups all tabs in area together. ex: $(...).idTabs(":grouped")
    False - jQuery selector is seperated into tab areas. ex: $(...).idTabs(":!grouped")
    default: false

 update (boolean)
    True - Rebinds idTabs ex: $(...).idTabs(":update");
    False - Cancels update ex: $(...).idTabs(":!update");

 remove (boolean)
    True - Removes idTabs ex: $(...).idTabs(":remove");
    False - Cancels removal ex: $(...).idTabs(":!remove");

*/

// Helper functions
var idTabs, //shortcut
undefined,  //speed up
href = function(e){ return $(e).attr("href"); },
type = function(o){ //reliable
  return o===null && "Null"
      || o===undefined && "Undefined"
      || ({}).toString.call(o).slice(8,-1);
};

$.fn.idTabs = function(){
  var s = idTabs.args.apply(this,arguments),
  action = s.update&&"update" || s.remove&&"remove" || "bind";
  s.area = this; //save context
  idTabs[action](s);
  return this; //chainable
};

idTabs = $.idTabs = function(tabarea,options,data){
  // Settings
  var e, tabs, items, test=$(), meta = $.metadata?$(tabarea).metadata():{}, //metadata
  s = {tab:idTabs.tab,item:idTabs.item}; //helpers
  s = $.extend(s,idTabs.settings,meta,options||{}); //settings
  s.tabarea = $(tabarea); //save context
  s.data = data||"idTabs"+ +new Date; //save expando

  // Play nice
  $.each({selected:'.',event:'!',start:'#'},function(n,c){
    if(type(s[n])=="String" && s[n].indexOf(c)==0)
      s[n] = s[n].substr(1); }); //removes type characters
  if(s.start===null) s.start=-1; //no tab selected

  // Find tabs
  items = []; //save elements
  s.tabs = tabs = $("a[href^=#]",tabarea); //save tabs
  tabs.each(function(){ //add items
    test = s.item(href(this));
    if(test.length) items=items.concat(test.get());
  });
  s.items = $(items).hide(); //hide items

  // Save Settings
  e="idTabs."+s.event;
  data=s.tabarea.data("idTabs")||{};
  data[e]=s;
  s.tabarea.data("idTabs",data);

  // Bind idTabs
  tabs.trigger(e).data(s.data,s)
      .bind(e,{s:s},function(){ //wrapper function due to jQuery bug
        return idTabs.unbind.apply(this,arguments); })
      .bind(s.event,{s:s},idTabs.find);

  // Select default tab
     type(s.start) == "Number" && (s.start<0 || (test=tabs.eq(s.start)).length)
  || type(s.start) == "String" && (test=tabs.filter("a[href=#"+s.start+"]")).length
  || (test=tabs.filter('.'+s.selected).removeClass(s.selected)).length
  || (s.start===undefined && (test=tabs.eq(0)).length);
  if(test.length) test.trigger(s.event);

  return s; //return current settings (be creative)
};

// Parse arguments into settings
idTabs.args = function(){
  var a,i=0,s={},args=arguments,
  // Handle string flags .!:
  str = function(_,a){
    if(a.indexOf('.')==0) s.selected = a;
    else if(a.indexOf('!')==0)
      if(/^!(true|false)$/i.test(a)) s.toggle = /^!true$/i.test(a);
      else s.event = a;
    else if(a.indexOf(':')==0) {
      a=a.substr(1).toLowerCase();
      if(a.indexOf('!')==0) s[a.substr(1)]=false;
      else s[a]=true;
    } else if(a) s.start = a;
  };
  // Loop through arguments matching options
  while(i<args.length) {
    a=args[i++];
    switch(type(a)){
      case "Object"   : $.extend(s,a); break;
      case "Boolean"  : s.change = a;  break;
      case "Number"   : s.start = a;   break;
      case "Function" : s.click = a;   break;
      case "Null"     : s.start = a;   break;
      case "String"   : $.each(a.split(/\s+/g),str);
      default: break;
    }
  }
  return s; //settings object
};

// Bind idTabs
idTabs.bind = function(s){
  if(!s) return;
  var data = "idTabs"+ +new Date; //instance expando
  if(s.grouped) $.idTabs(s.area,s,data);
  else s.area.each(function(){ $.idTabs(this,s,data); });
};

// Rebind idTabs
idTabs.update = function(s){
  if(!s) return;
  s.update=false;
  var self,data,n,e = s.event;
  e = (e+"").indexOf('!')==0 && e.substr(1) || e;
  e = e?"idTabs."+e:"";
  return s.area.each(function(){
    self = $(this);
    data = self.data("idTabs");
    if(!data) return;
    if(e) {
      n=$.extend({},data[e],s);
      idTabs.remove(data[e])
      idTabs(n.tabarea,n,n.data);
    } else for(e in data) {
      if(!Object.hasOwnProperty.call(data, e)) continue;
      n=$.extend({},data[e],s);
      idTabs.remove(data[e]);
      idTabs(n.tabarea,n,n.data);
    }
  });
};

// Unbind idTabs
idTabs.remove = function(s){
  if(!s) return;
  var data,tabs,e = s.event;
  e = (e+"").indexOf('!')==0 && e.substr(1) || e;
  e = "idTabs"+(e?"."+e:"");
  return s.area.each(function(){
    data=$(this).data("idTabs");
    delete data["idTabs."+s.event];
    $(this).data("idTabs",data);
    tabs = s.tabs || $("a[href^=#]",this); //save tabs
    if(!tabs.length && $(this).is("a[href^=#]")) tabs = $(this);
    tabs.trigger(e);
  });
};

// Find tabs
idTabs.find = function(e){
  // Save self since clicked tab may not be the first tab in the tabarea
  var self=this, ret=false, s=e.data.s;
  // Find first tab within each tabset
  $("a[href="+href(this)+"]:first",s.area).each(function(){
    var t = $(this).data(s.data); //tab's settings
    if(t) ret=idTabs.showtab.call(t.tabarea==s.tabarea?self:this,t,e)||ret;
  });
  return ret;
};

// Show tab
idTabs.showtab = function(s,e){
  if(!s || !s.toggle && $(this).is('.'+s.selected))
    return s&&s.change; //return if already selected
  var id = href(this); //find id
  if(s.click && s.click.call(this,id,s,e)==false) return s.change; //call custom func
  if(s.toggle && $(this).is('.'+s.selected)) id=null; //hide items
  return idTabs.show.call(this,id,s,e); //call default func
};

// Show item
idTabs.show = function(id,s){
  s.tabs.removeClass(s.selected); //clear tabs
  s.tab(id).addClass(s.selected); //select tab(s)
  s.items.hide(); //hide all items
  s.item(id).show(); //show item(s)
  return s.change; //option for changing url
};

// Unbind idTabs
idTabs.unbind = function(e){
  var s = e.data.s;
  $(this).removeData(s.data)
  .unbind("idTabs."+s.event);
  return false;
};

// Extend idTabs
idTabs.extend = function(){
  var args = arguments;
  return function(){
    [].push.apply(args,arguments);
    this.idTabs.apply(this,args);
  };
};

// Matching tabs
idTabs.tab = function(id){
  if(!id) return $([]);
  return $("a[href="+id+"]",this.tabarea);
};

// Matching items
idTabs.item = function(id){
  if(!id) return $([]);
  var item = $(id);
  return item.length?item:$('.'+id.substr(1));
};

// Defaults
idTabs.settings = {
  start:undefined,
  change:false,
  click:null,
  selected:".selected",
  event:"!click",
  toggle:false,
  grouped:false
};

// Version
idTabs.version = "3.0";

// Auto-run
$(function(){ $(".idTabs").idTabs(); });

})(jQuery);


/* ===================================================
 * bootstrap-transition.js v2.0.1
 * http://twitter.github.com/bootstrap/javascript.html#transitions
 * ===================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

!function( $ ) {

  $(function () {

    "use strict"

    /* CSS TRANSITION SUPPORT (https://gist.github.com/373874)
     * ======================================================= */

    $.support.transition = (function () {
      var thisBody = document.body || document.documentElement
        , thisStyle = thisBody.style
        , support = thisStyle.transition !== undefined || thisStyle.WebkitTransition !== undefined || thisStyle.MozTransition !== undefined || thisStyle.MsTransition !== undefined || thisStyle.OTransition !== undefined

      return support && {
        end: (function () {
          var transitionEnd = "TransitionEnd"
          if ( $.browser.webkit ) {
          	transitionEnd = "webkitTransitionEnd"
          } else if ( $.browser.mozilla ) {
          	transitionEnd = "transitionend"
          } else if ( $.browser.opera ) {
          	transitionEnd = "oTransitionEnd"
          }
          return transitionEnd
        }())
      }
    })()

  })

}( window.jQuery );
/* =========================================================
 * bootstrap-modal.js v2.0.1
 * http://twitter.github.com/bootstrap/javascript.html#modals
 * =========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================= */


!function( $ ){

  "use strict"

 /* MODAL CLASS DEFINITION
  * ====================== */

  var Modal = function ( content, options ) {
    this.options = options
    this.$element = $(content)
      .delegate('[data-dismiss="modal"]', 'click.dismiss.modal', $.proxy(this.hide, this))
  }

  Modal.prototype = {

      constructor: Modal

    , toggle: function () {
        return this[!this.isShown ? 'show' : 'hide']()
      }

    , show: function () {
        var that = this

        if (this.isShown) return

        $('body').addClass('modal-open')

        this.isShown = true
        this.$element.trigger('show')

        escape.call(this)
        backdrop.call(this, function () {
          var transition = $.support.transition && that.$element.hasClass('fade')

          !that.$element.parent().length && that.$element.appendTo(document.body) //don't move modals dom position

          that.$element
            .show()

          if (transition) {
            that.$element[0].offsetWidth // force reflow
          }

          that.$element.addClass('in')

          transition ?
            that.$element.one($.support.transition.end, function () { that.$element.trigger('shown') }) :
            that.$element.trigger('shown')

        })
      }

    , hide: function ( e ) {
        e && e.preventDefault()

        if (!this.isShown) return

        var that = this
        this.isShown = false

        $('body').removeClass('modal-open')

        escape.call(this)

        this.$element
          .trigger('hide')
          .removeClass('in')

        $.support.transition && this.$element.hasClass('fade') ?
          hideWithTransition.call(this) :
          hideModal.call(this)
      }

  }


 /* MODAL PRIVATE METHODS
  * ===================== */

  function hideWithTransition() {
    var that = this
      , timeout = setTimeout(function () {
          that.$element.off($.support.transition.end)
          hideModal.call(that)
        }, 500)

    this.$element.one($.support.transition.end, function () {
      clearTimeout(timeout)
      hideModal.call(that)
    })
  }

  function hideModal( that ) {
    this.$element
      .hide()
      .trigger('hidden')

    backdrop.call(this)
  }

  function backdrop( callback ) {
    var that = this
      , animate = this.$element.hasClass('fade') ? 'fade' : ''

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate

      this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
        .appendTo(document.body)

      if (this.options.backdrop != 'static') {
        this.$backdrop.click($.proxy(this.hide, this))
      }

      if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

      this.$backdrop.addClass('in')

      doAnimate ?
        this.$backdrop.one($.support.transition.end, callback) :
        callback()

    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in')

      $.support.transition && this.$element.hasClass('fade')?
        this.$backdrop.one($.support.transition.end, $.proxy(removeBackdrop, this)) :
        removeBackdrop.call(this)

    } else if (callback) {
      callback()
    }
  }

  function removeBackdrop() {
    this.$backdrop.remove()
    this.$backdrop = null
  }

  function escape() {
    var that = this
    if (this.isShown && this.options.keyboard) {
      $(document).on('keyup.dismiss.modal', function ( e ) {
        e.which == 27 && that.hide()
      })
    } else if (!this.isShown) {
      $(document).off('keyup.dismiss.modal')
    }
  }


 /* MODAL PLUGIN DEFINITION
  * ======================= */

  $.fn.modal = function ( option ) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('modal')
        , options = $.extend({}, $.fn.modal.defaults, $this.data(), typeof option == 'object' && option)
      if (!data) $this.data('modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option]()
      else if (options.show) data.show()
    })
  }

  $.fn.modal.defaults = {
      backdrop: true
    , keyboard: true
    , show: true
  }

  $.fn.modal.Constructor = Modal


 /* MODAL DATA-API
  * ============== */

  $(function () {
    $('body').on('click.modal.data-api', '[data-toggle="modal"]', function ( e ) {
      var $this = $(this), href
        , $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
        , option = $target.data('modal') ? 'toggle' : $.extend({}, $target.data(), $this.data())

      e.preventDefault()
      $target.modal(option)
    })
  })

}( window.jQuery );
/* ========================================================
 * bootstrap-tab.js v2.0.1
 * http://twitter.github.com/bootstrap/javascript.html#tabs
 * ========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ======================================================== */


!function( $ ){

  "use strict"

 /* TAB CLASS DEFINITION
  * ==================== */

  var Tab = function ( element ) {
    this.element = $(element)
  }

  Tab.prototype = {

    constructor: Tab

  , show: function () {
      var $this = this.element
        , $ul = $this.closest('ul:not(.dropdown-menu)')
        , selector = $this.attr('data-target')
        , previous
        , $target

      if (!selector) {
        selector = $this.attr('href')
        selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
      }

      if ( $this.parent('li').hasClass('active') ) return

      previous = $ul.find('.active a').last()[0]

      $this.trigger({
        type: 'show'
      , relatedTarget: previous
      })

      $target = $(selector)

      this.activate($this.parent('li'), $ul)
      this.activate($target, $target.parent(), function () {
        $this.trigger({
          type: 'shown'
        , relatedTarget: previous
        })
      })
    }

  , activate: function ( element, container, callback) {
      var $active = container.find('> .active')
        , transition = callback
            && $.support.transition
            && $active.hasClass('fade')

      function next() {
        $active
          .removeClass('active')
          .find('> .dropdown-menu > .active')
          .removeClass('active')

        element.addClass('active')

        if (transition) {
          element[0].offsetWidth // reflow for transition
          element.addClass('in')
        } else {
          element.removeClass('fade')
        }

        if ( element.parent('.dropdown-menu') ) {
          element.closest('li.dropdown').addClass('active')
        }

        callback && callback()
      }

      transition ?
        $active.one($.support.transition.end, next) :
        next()

      $active.removeClass('in')
    }
  }


 /* TAB PLUGIN DEFINITION
  * ===================== */

  $.fn.tab = function ( option ) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('tab')
      if (!data) $this.data('tab', (data = new Tab(this)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.tab.Constructor = Tab


 /* TAB DATA-API
  * ============ */

  $(function () {
    $('body').on('click.tab.data-api', '[data-toggle="tab"], [data-toggle="pill"]', function (e) {
      e.preventDefault()
      $(this).tab('show')
    })
  })

}( window.jQuery );
/* ==========================================================
 * bootstrap-carousel.js v2.0.1
 * http://twitter.github.com/bootstrap/javascript.html#carousel
 * ==========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function( $ ){

  "use strict"

 /* CAROUSEL CLASS DEFINITION
  * ========================= */

  var Carousel = function (element, options) {
    this.$element = $(element)
    this.options = $.extend({}, $.fn.carousel.defaults, options)
    this.options.slide && this.slide(this.options.slide)
  }

  Carousel.prototype = {

    cycle: function () {
      this.interval = setInterval($.proxy(this.next, this), this.options.interval)
      return this
    }

  , to: function (pos) {
      var $active = this.$element.find('.active')
        , children = $active.parent().children()
        , activePos = children.index($active)
        , that = this

      if (pos > (children.length - 1) || pos < 0) return

      if (this.sliding) {
        return this.$element.one('slid', function () {
          that.to(pos)
        })
      }

      if (activePos == pos) {
        return this.pause().cycle()
      }

      return this.slide(pos > activePos ? 'next' : 'prev', $(children[pos]))
    }

  , pause: function () {
      clearInterval(this.interval)
      this.interval = null
      return this
    }

  , next: function () {
      if (this.sliding) return
      return this.slide('next')
    }

  , prev: function () {
      if (this.sliding) return
      return this.slide('prev')
    }

  , slide: function (type, next) {
      var $active = this.$element.find('.active')
        , $next = next || $active[type]()
        , isCycling = this.interval
        , direction = type == 'next' ? 'left' : 'right'
        , fallback  = type == 'next' ? 'first' : 'last'
        , that = this

      if (!$next.length) return

      this.sliding = true

      isCycling && this.pause()

      $next = $next.length ? $next : this.$element.find('.item')[fallback]()

      if (!$.support.transition && this.$element.hasClass('slide')) {
        this.$element.trigger('slide')
        $active.removeClass('active')
        $next.addClass('active')
        this.sliding = false
        this.$element.trigger('slid')
      } else {
        $next.addClass(type)
        $next[0].offsetWidth // force reflow
        $active.addClass(direction)
        $next.addClass(direction)
        this.$element.trigger('slide')
        this.$element.one($.support.transition.end, function () {
          $next.removeClass([type, direction].join(' ')).addClass('active')
          $active.removeClass(['active', direction].join(' '))
          that.sliding = false
          setTimeout(function () { that.$element.trigger('slid') }, 0)
        })
      }

      isCycling && this.cycle()

      return this
    }

  }


 /* CAROUSEL PLUGIN DEFINITION
  * ========================== */

  $.fn.carousel = function ( option ) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('carousel')
        , options = typeof option == 'object' && option
      if (!data) $this.data('carousel', (data = new Carousel(this, options)))
      if (typeof option == 'number') data.to(option)
      else if (typeof option == 'string' || (option = options.slide)) data[option]()
      else data.cycle()
    })
  }

  $.fn.carousel.defaults = {
    interval: 5000
  }

  $.fn.carousel.Constructor = Carousel


 /* CAROUSEL DATA-API
  * ================= */

  $(function () {
    $('body').on('click.carousel.data-api', '[data-slide]', function ( e ) {
      var $this = $(this), href
        , $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) //strip for ie7
        , options = !$target.data('modal') && $.extend({}, $target.data(), $this.data())
      $target.carousel(options)
      e.preventDefault()
    })
  })

}( window.jQuery );

/* =============================================================
 * bootstrap-typeahead.js v2.0.2
 * http://twitter.github.com/bootstrap/javascript.html#typeahead
 * =============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */

!function( $ ){

  "use strict"

  var Typeahead = function ( element, options ) {
    this.$element = $(element)
    this.options = $.extend({}, $.fn.typeahead.defaults, options)
    this.matcher = this.options.matcher || this.matcher
    this.sorter = this.options.sorter || this.sorter
    this.highlighter = this.options.highlighter || this.highlighter
    this.$menu = $(this.options.menu).appendTo('body')
    this.source = this.options.source
    this.shown = false
    this.listen()
  }

  Typeahead.prototype = {

    constructor: Typeahead

  , select: function () {
      var val = this.$menu.find('.active').attr('data-value')
      this.$element.val(val)
      this.$element.change();
      return this.hide()
    }

  , show: function () {
      var pos = $.extend({}, this.$element.offset(), {
        height: this.$element[0].offsetHeight
      })

      this.$menu.css({
        top: pos.top + pos.height
      , left: pos.left
      })

      this.$menu.show()
      this.shown = true
      return this
    }

  , hide: function () {
      this.$menu.hide()
      this.shown = false
      return this
    }

  , lookup: function (event) {
      var that = this
        , items
        , q

      this.query = this.$element.val()

      if (!this.query) {
        return this.shown ? this.hide() : this
      }

      items = $.grep(this.source, function (item) {
        if (that.matcher(item)) return item
      })

      items = this.sorter(items)

      if (!items.length) {
        return this.shown ? this.hide() : this
      }

      return this.render(items.slice(0, this.options.items)).show()
    }

  , matcher: function (item) {
      return ~item.toLowerCase().indexOf(this.query.toLowerCase())
    }

  , sorter: function (items) {
      var beginswith = []
        , caseSensitive = []
        , caseInsensitive = []
        , item

      while (item = items.shift()) {
        if (!item.toLowerCase().indexOf(this.query.toLowerCase())) beginswith.push(item)
        else if (~item.indexOf(this.query)) caseSensitive.push(item)
        else caseInsensitive.push(item)
      }

      return beginswith.concat(caseSensitive, caseInsensitive)
    }

  , highlighter: function (item) {
      return item.replace(new RegExp('(' + this.query + ')', 'ig'), function ($1, match) {
        return '<strong>' + match + '</strong>'
      })
    }

  , render: function (items) {
      var that = this

      items = $(items).map(function (i, item) {
        i = $(that.options.item).attr('data-value', item)
        i.find('a').html(that.highlighter(item))
        return i[0]
      })

      items.first().addClass('active')
      this.$menu.html(items)
      return this
    }

  , next: function (event) {
      var active = this.$menu.find('.active').removeClass('active')
        , next = active.next()

      if (!next.length) {
        next = $(this.$menu.find('li')[0])
      }

      next.addClass('active')
    }

  , prev: function (event) {
      var active = this.$menu.find('.active').removeClass('active')
        , prev = active.prev()

      if (!prev.length) {
        prev = this.$menu.find('li').last()
      }

      prev.addClass('active')
    }

  , listen: function () {
      this.$element
        .on('blur',     $.proxy(this.blur, this))
        .on('keypress', $.proxy(this.keypress, this))
        .on('keyup',    $.proxy(this.keyup, this))

      if ($.browser.webkit || $.browser.msie) {
        this.$element.on('keydown', $.proxy(this.keypress, this))
      }

      this.$menu
        .on('click', $.proxy(this.click, this))
        .on('mouseenter', 'li', $.proxy(this.mouseenter, this))
    }

  , keyup: function (e) {
      switch(e.keyCode) {
        case 40: // down arrow
        case 38: // up arrow
          break

        case 9: // tab
        case 13: // enter
          if (!this.shown) return
          this.select()
          break

        case 27: // escape
          if (!this.shown) return
          this.hide()
          break

        default:
          this.lookup()
      }

      e.stopPropagation()
      e.preventDefault()
  }

  , keypress: function (e) {
      if (!this.shown) return

      switch(e.keyCode) {
        case 9: // tab
        case 13: // enter
        case 27: // escape
          e.preventDefault()
          break

        case 38: // up arrow
          e.preventDefault()
          this.prev()
          break

        case 40: // down arrow
          e.preventDefault()
          this.next()
          break
      }

      e.stopPropagation()
    }

  , blur: function (e) {
      var that = this
      setTimeout(function () { that.hide() }, 150)
    }

  , click: function (e) {
      e.stopPropagation()
      e.preventDefault()
      this.select()
    }

  , mouseenter: function (e) {
      this.$menu.find('.active').removeClass('active')
      $(e.currentTarget).addClass('active')
    }

  }


  /* TYPEAHEAD PLUGIN DEFINITION
   * =========================== */

  $.fn.typeahead = function ( option ) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('typeahead')
        , options = typeof option == 'object' && option
      if (!data) $this.data('typeahead', (data = new Typeahead(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.typeahead.defaults = {
    source: []
  , items: 8
  , menu: '<ul class="typeahead dropdown-menu"></ul>'
  , item: '<li><a href="#"></a></li>'
  }

  $.fn.typeahead.Constructor = Typeahead


 /* TYPEAHEAD DATA-API
  * ================== */

  $(function () {
    $('body').on('focus.typeahead.data-api', '[data-provide="typeahead"]', function (e) {
      var $this = $(this)
      if ($this.data('typeahead')) return
      e.preventDefault()
      $this.typeahead($this.data())
    })
  })

}( window.jQuery );


// Sticky v1.0 by Daniel Raftery
// http://thrivingkings.com/sticky
//
// http://twitter.com/ThrivingKings

(function($){$.sticky=function(note,options,callback){return $.fn.sticky(note,options,callback)};$.fn.sticky=function(note,options,callback){var position="top-right";var settings={speed:"fast",duplicates:true,autoclose:5000};if(!note){note=this.html()}if(options){$.extend(settings,options)}var display=true;var duplicate="no";var uniqID=Math.floor(Math.random()*99999);$(".sticky-note").each(function(){if($(this).html()==note&&$(this).is(":visible")){duplicate="yes";if(!settings.duplicates){display=false}}if($(this).attr("id")==uniqID){uniqID=Math.floor(Math.random()*9999999)}});if(!$("body").find(".sticky-queue").html()){$("body").append('<div class="sticky-queue '+position+'"></div>')}if(display){$(".sticky-queue").prepend('<div class="sticky border-'+position+'" id="'+uniqID+'"></div>');$("#"+uniqID).append('<img src="close.png" class="sticky-close" rel="'+uniqID+'" title="Close" />');$("#"+uniqID).append('<div class="sticky-note" rel="'+uniqID+'">'+note+"</div>");var height=$("#"+uniqID).height();$("#"+uniqID).css("height",height);$("#"+uniqID).slideDown(settings.speed);display=true}$(".sticky").ready(function(){if(settings.autoclose){$("#"+uniqID).delay(settings.autoclose).fadeOut(settings.speed)}});$(".sticky-close").click(function(){$("#"+$(this).attr("rel")).dequeue().fadeOut(settings.speed)});var response={id:uniqID,duplicate:duplicate,displayed:display,position:position};if(callback){callback(response)}else{return(response)}}})(jQuery);




/*!
 * AmplifyJS 1.1.0 - Core, Store, Request
 * 
 * Copyright 2011 appendTo LLC. (http://appendto.com/team)
 * Dual licensed under the MIT or GPL licenses.
 * http://appendto.com/open-source-licenses
 * 
 * http://amplifyjs.com
 */
(function(a,b){var c=[].slice,d={},e=a.amplify={publish:function(a){var b=c.call(arguments,1),e,f,g,h=0,i;if(!d[a])return!0;e=d[a].slice();for(g=e.length;h<g;h++){f=e[h],i=f.callback.apply(f.context,b);if(i===!1)break}return i!==!1},subscribe:function(a,b,c,e){arguments.length===3&&typeof c=="number"&&(e=c,c=b,b=null),arguments.length===2&&(c=b,b=null),e=e||10;var f=0,g=a.split(/\s/),h=g.length,i;for(;f<h;f++){a=g[f],i=!1,d[a]||(d[a]=[]);var j=d[a].length-1,k={callback:c,context:b,priority:e};for(;j>=0;j--)if(d[a][j].priority<=e){d[a].splice(j+1,0,k),i=!0;break}i||d[a].unshift(k)}return c},unsubscribe:function(a,b){if(!!d[a]){var c=d[a].length,e=0;for(;e<c;e++)if(d[a][e].callback===b){d[a].splice(e,1);break}}}}})(this),function(a,b){function e(a,e){c.addType(a,function(f,g,h){var i,j,k,l,m=g,n=(new Date).getTime();if(!f){m={},l=[],k=0;try{f=e.length;while(f=e.key(k++))d.test(f)&&(j=JSON.parse(e.getItem(f)),j.expires&&j.expires<=n?l.push(f):m[f.replace(d,"")]=j.data);while(f=l.pop())e.removeItem(f)}catch(o){}return m}f="__amplify__"+f;if(g===b){i=e.getItem(f),j=i?JSON.parse(i):{expires:-1};if(j.expires&&j.expires<=n)e.removeItem(f);else return j.data}else if(g===null)e.removeItem(f);else{j=JSON.stringify({data:g,expires:h.expires?n+h.expires:null});try{e.setItem(f,j)}catch(o){c[a]();try{e.setItem(f,j)}catch(o){throw c.error()}}}return m})}var c=a.store=function(a,b,d,e){var e=c.type;d&&d.type&&d.type in c.types&&(e=d.type);return c.types[e](a,b,d||{})};c.types={},c.type=null,c.addType=function(a,b){c.type||(c.type=a),c.types[a]=b,c[a]=function(b,d,e){e=e||{},e.type=a;return c(b,d,e)}},c.error=function(){return"amplify.store quota exceeded"};var d=/^__amplify__/;for(var f in{localStorage:1,sessionStorage:1})try{window[f].getItem&&e(f,window[f])}catch(g){}if(window.globalStorage)try{e("globalStorage",window.globalStorage[window.location.hostname]),c.type==="sessionStorage"&&(c.type="globalStorage")}catch(g){}(function(){if(!c.types.localStorage){var a=document.createElement("div"),d="amplify";a.style.display="none",document.getElementsByTagName("head")[0].appendChild(a);try{a.addBehavior("#default#userdata"),a.load(d)}catch(e){a.parentNode.removeChild(a);return}c.addType("userData",function(e,f,g){a.load(d);var h,i,j,k,l,m=f,n=(new Date).getTime();if(!e){m={},l=[],k=0;while(h=a.XMLDocument.documentElement.attributes[k++])i=JSON.parse(h.value),i.expires&&i.expires<=n?l.push(h.name):m[h.name]=i.data;while(e=l.pop())a.removeAttribute(e);a.save(d);return m}e=e.replace(/[^-._0-9A-Za-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u37f-\u1fff\u200c-\u200d\u203f\u2040\u2070-\u218f]/g,"-");if(f===b){h=a.getAttribute(e),i=h?JSON.parse(h):{expires:-1};if(i.expires&&i.expires<=n)a.removeAttribute(e);else return i.data}else f===null?a.removeAttribute(e):(j=a.getAttribute(e),i=JSON.stringify({data:f,expires:g.expires?n+g.expires:null}),a.setAttribute(e,i));try{a.save(d)}catch(o){j===null?a.removeAttribute(e):a.setAttribute(e,j),c.userData();try{a.setAttribute(e,i),a.save(d)}catch(o){j===null?a.removeAttribute(e):a.setAttribute(e,j);throw c.error()}}return m})}})(),function(){function e(a){return a===b?b:JSON.parse(JSON.stringify(a))}var a={},d={};c.addType("memory",function(c,f,g){if(!c)return e(a);if(f===b)return e(a[c]);d[c]&&(clearTimeout(d[c]),delete d[c]);if(f===null){delete a[c];return null}a[c]=f,g.expires&&(d[c]=setTimeout(function(){delete a[c],delete d[c]},g.expires));return f})}()}(this.amplify=this.amplify||{}),function(a,b){function e(a){var b=!1;setTimeout(function(){b=!0},1);return function(){var c=this,d=arguments;b?a.apply(c,d):setTimeout(function(){a.apply(c,d)},1)}}function d(a){return{}.toString.call(a)==="[object Function]"}function c(){}a.request=function(b,f,g){var h=b||{};typeof h=="string"&&(d(f)&&(g=f,f={}),h={resourceId:b,data:f||{},success:g});var i={abort:c},j=a.request.resources[h.resourceId],k=h.success||c,l=h.error||c;h.success=e(function(b,c){c=c||"success",a.publish("request.success",h,b,c),a.publish("request.complete",h,b,c),k(b,c)}),h.error=e(function(b,c){c=c||"error",a.publish("request.error",h,b,c),a.publish("request.complete",h,b,c),l(b,c)});if(!j){if(!h.resourceId)throw"amplify.request: no resourceId provided";throw"amplify.request: unknown resourceId: "+h.resourceId}if(!a.publish("request.before",h))h.error(null,"abort");else{a.request.resources[h.resourceId](h,i);return i}},a.request.types={},a.request.resources={},a.request.define=function(b,c,d){if(typeof c=="string"){if(!(c in a.request.types))throw"amplify.request.define: unknown type: "+c;d.resourceId=b,a.request.resources[b]=a.request.types[c](d)}else a.request.resources[b]=c}}(amplify),function(a,b,c){var d=["status","statusText","responseText","responseXML","readyState"],e=/\{([^\}]+)\}/g;a.request.types.ajax=function(e){e=b.extend({type:"GET"},e);return function(f,g){function n(a,e){b.each(d,function(a,b){try{m[b]=h[b]}catch(c){}}),/OK$/.test(m.statusText)&&(m.statusText="success"),a===c&&(a=null),l&&(e="abort"),/timeout|error|abort/.test(e)?m.error(a,e):m.success(a,e),n=b.noop}var h,i=e.url,j=g.abort,k=b.extend(!0,{},e,{data:f.data}),l=!1,m={readyState:0,setRequestHeader:function(a,b){return h.setRequestHeader(a,b)},getAllResponseHeaders:function(){return h.getAllResponseHeaders()},getResponseHeader:function(a){return h.getResponseHeader(a)},overrideMimeType:function(a){return h.overrideMideType(a)},abort:function(){l=!0;try{h.abort()}catch(a){}n(null,"abort")},success:function(a,b){f.success(a,b)},error:function(a,b){f.error(a,b)}};a.publish("request.ajax.preprocess",e,f,k,m),b.extend(k,{success:function(a,b){n(a,b)},error:function(a,b){n(null,b)},beforeSend:function(b,c){h=b,k=c;var d=e.beforeSend?e.beforeSend.call(this,m,k):!0;return d&&a.publish("request.before.ajax",e,f,k,m)}}),b.ajax(k),g.abort=function(){m.abort(),j.call(this)}}},a.subscribe("request.ajax.preprocess",function(a,c,d){var f=[],g=d.data;typeof g!="string"&&(g=b.extend(!0,{},a.data,g),d.url=d.url.replace(e,function(a,b){if(b in g){f.push(b);return g[b]}}),b.each(f,function(a,b){delete g[b]}),d.data=g)}),a.subscribe("request.ajax.preprocess",function(a,c,d){var e=d.data,f=a.dataMap;!!f&&typeof e!="string"&&(b.isFunction(f)?d.data=f(e):(b.each(a.dataMap,function(a,b){a in e&&(e[b]=e[a],delete e[a])}),d.data=e))});var f=a.request.cache={_key:function(a,b,c){function g(){return c.charCodeAt(e++)<<24|c.charCodeAt(e++)<<16|c.charCodeAt(e++)<<8|c.charCodeAt(e++)<<0}c=b+c;var d=c.length,e=0,f=g();while(e<d)f^=g();return"request-"+a+"-"+f},_default:function(){var a={};return function(b,c,d,e){var g=f._key(c.resourceId,d.url,d.data),h=b.cache;if(g in a){e.success(a[g]);return!1}var i=e.success;e.success=function(b){a[g]=b,typeof h=="number"&&setTimeout(function(){delete a[g]},h),i.apply(this,arguments)}}}()};a.store&&(b.each(a.store.types,function(b){f[b]=function(c,d,e,g){var h=f._key(d.resourceId,e.url,e.data),i=a.store[b](h);if(i){e.success(i);return!1}var j=g.success;g.success=function(d){a.store[b](h,d,{expires:c.cache.expires}),j.apply(this,arguments)}}}),f.persist=f[a.store.type]),a.subscribe("request.before.ajax",function(a){var b=a.cache;if(b){b=b.type||b;return f[b in f?b:"_default"].apply(this,arguments)}}),a.request.decoders={jsend:function(a,b,c,d,e){a.status==="success"?d(a.data):a.status==="fail"?e(a.data,"fail"):a.status==="error"&&(delete a.status,e(a,"error"))}},a.subscribe("request.before.ajax",function(c,d,e,f){function k(a,b){h(a,b)}function j(a,b){g(a,b)}var g=f.success,h=f.error,i=b.isFunction(c.decoder)?c.decoder:c.decoder in a.request.decoders?a.request.decoders[c.decoder]:a.request.decoders._default;!i||(f.success=function(a,b){i(a,b,f,j,k)},f.error=function(a,b){i(a,b,f,j,k)})})}(amplify,jQuery)


// GENERAL

// Slide menu and content area
$('#menumodal').bind('click', function() {
	$('#myModal').modal();
});
$('.resultLink').bind('click', function() {
	$('#resultsModal').modal();
});

$('#myModal').modal({
  keyboard: true,
  show: false
});
$('#resultsModal').modal({
  keyboard: true,
  show: false
});