// jQuery.naturalWidth / jQuery.naturalHeight plugin for (already-loaded) images

// Triple-licensed: Public Domain, MIT and WTFPL license - share and enjoy!

(function($) {
  function img(url) {
    var i = new Image;
    i.src = url;
    return i;
  }

  if ('naturalWidth' in (new Image)) {
    $.fn.naturalWidth  = function() { return this[0].naturalWidth || img($(this).attr("src")).width; };
    $.fn.naturalHeight = function() { return this[0].naturalHeight || img($(this).attr("src")).height; };
    return;
  }

  $.fn.naturalWidth  = function() { return img($(this).attr("src")).width; };
  $.fn.naturalHeight = function() { return img($(this).attr("src")).height; };

})(jQuery);
