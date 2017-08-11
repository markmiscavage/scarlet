/**
 * Plugin based on jQuery Hotspot
 *
   * Website: https://github.com/Aniruddha22/jquery-hotspot
 *
 * License: http://www.opensource.org/licenses/mit-license.php
 */

import draggable from 'jquery-ui/ui/widgets/draggable';

(function($) {
  // Default settings for the plugin
  const defaults = {
    data: [],
    formFields: '',
    emptyFields: '',
    tag: 'img',
    hiddenClass: 'hidden',
    hotspotClass: 'HotspotPlugin_Hotspot',
    hotspotAuxClass: 'HotspotPlugin_inc',
    hotspotOverlayClass: 'HotspotPlugin_Overlay',
    dataStuff: [
      {
        property: 'Label',
        default: '',
      },
    ],
  };

  // Constructor
  function Hotspot(element, options) {
    // Overwriting defaults with options
    this.config = $.extend(true, {}, defaults, options);

    this.element = element;
    this.imageEl = element.find(this.config.tag);
    this.imageParent = this.imageEl.parent();

    this.broadcast = '';

    const widget = this;

    // Event API for users
    $.each(this.config, (index, val) => {
      if (typeof val === 'function') {
        widget.element.on(`${index}.hotspot`, () => {
          val(widget.broadcast);
        });
      }
    });

    this.init();
  }

  Hotspot.prototype.init = function init() {
    this.beautifyData();

    this.setFormFields(false);

    const height = this.imageEl[0].height;
    const width = this.imageEl[0].width;

    // Masking the image
    $('<span/>', {
      html: '<p></p>',
    })
      .css({
        height: `${height}px`,
        width: `${width}px`,
      })
      .addClass(this.config.hotspotOverlayClass)
      .appendTo(this.imageParent);

    const widget = this;
    const data = [];

    // Start storing
    this.element.delegate('span', 'click', function(event) {
      event.preventDefault();

      const offset = $(this).offset();
      const relativeX = event.pageX - offset.left;
      const relativeY = event.pageY - offset.top;

      const dataStuff = widget.config.dataStuff;

      const dataBuild = {
        x: relativeX,
        y: relativeY,
      };

      widget.setFormFields(true, Math.floor(dataBuild.x), Math.floor(dataBuild.y));

      data.push(dataBuild);

      const htmlBuilt = $('<div/>');

      $.each(dataBuild, (index, val) => {
        if (typeof val === 'string') {
          $('<div/>', {
            html: val,
          })
            .addClass(`Hotspot_${index}`)
            .appendTo(htmlBuilt);
        }
      });

      const div = $(`<div id="spot-${Math.floor(dataBuild.x)}-${Math.floor(dataBuild.y)}"></div>`, {
        html: htmlBuilt,
      })
        .css({
          top: `${relativeY}px`,
          left: `${relativeX}px`,
        })
        .addClass(`${widget.config.hotspotClass} ${widget.config.hotspotAuxClass}`)
        .appendTo(widget.element);

      htmlBuilt.removeClass(widget.config.hiddenClass);

      htmlBuilt.css('display', 'none');
      $(`div#spot-${Math.floor(dataBuild.x)}-${Math.floor(dataBuild.y)}`).draggable({
        containment: '#img-hotspot-asset',
        stop: handleDragStop,
      });
    });
  };

  function handleDragStop(event, ui) {
    const offsetXPos = parseInt(ui.offset.left);
    const offsetYPos = parseInt(ui.offset.top);

    const originalFieldset = `#frm-spot-${ui.originalPosition.left}-${ui.originalPosition.top}`;
    $(originalFieldset).attr('id', `frm-spot-${ui.position.left}-${ui.position.top}`);

    const xSpot = `#x-spot-${ui.originalPosition.left}-${ui.originalPosition.top}`;
    const ySpot = `#y-spot-${ui.originalPosition.left}-${ui.originalPosition.top}`;
    $(xSpot).attr('value', ui.position.left);
    $(ySpot).attr('value', ui.position.top);
  }

  Hotspot.prototype.beautifyData = function beautifyData() {
    const widget = this;
    const obj = this.config.data;

    for (let i = obj.length - 1; i >= 0; i--) {
      const el = obj[i];

      var htmlBuilt = $('<div/>');

      $.each(el, (index, val) => {
        if (typeof val === 'string') {
          $('<div/>', {
            html: val,
          })
            .addClass(`Hotspot_${index}`)
            .appendTo(htmlBuilt);
        }
      });

      const itemOrder = el.order;

      const div = $(
        `<div id="spot-${Math.floor(el.x)}-${Math.floor(el.y)}"><span>${itemOrder}</span></div>`,
        {
          html: htmlBuilt,
        },
      )
        .css({
          top: `${el.y}px`,
          left: `${el.x}px`,
        })
        .addClass(this.config.hotspotClass)
        .appendTo(this.element);

      $(`div#spot-${Math.floor(el.x)}-${Math.floor(el.y)}`).draggable({
        containment: '#img-hotspot-asset',
        stop: handleDragStop,
      });

      htmlBuilt.removeClass(this.config.hiddenClass);

      htmlBuilt.css('display', 'block');
    }
  };

  Hotspot.prototype.setFormFields = function setFormFields(newItem, x = '', y = '') {
    const event = new Event('hotspot-click');
    if (newItem) {
      let newEmptyFields = this.config.emptyFields;
      newEmptyFields = this.config.emptyFields.replace(/--/g, `-${x}-${y}`);
      newEmptyFields = newEmptyFields.replace(
        /name="x-coord" value=""/g,
        `name="x-coord" value="${x}"`,
      );
      newEmptyFields = newEmptyFields.replace(
        /name="y-coord" value=""/g,
        `name="y-coord" value="${y}"`,
      );

      $('#div-scarlet-hotspot-form').append(newEmptyFields);
      document.dispatchEvent(event);
    } else {
      $('#div-scarlet-hotspot-form').append(this.config.formFields);
      document.dispatchEvent(event);
    }
  };

  $.fn.hotspot = function(options) {
    new Hotspot(this, options);
    return this;
  };
})(jQuery);
