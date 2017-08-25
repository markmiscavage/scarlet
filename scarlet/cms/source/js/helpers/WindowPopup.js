/**
 * Create Window object
 */
class WindowPopup {
  /**
	 * @param  {string}
	 * @param  {string}
	 * @param  {object}
	 * @param  {Function}
	 */
  constructor(url, name, options, cb, asset = '') {
    this.url = url;
    this.assetUrl = asset;
    this.options = options;
    this.cb = cb;
    this.name = name;
    this.newWin = null;
  }

  /**
	 * open window
	 */
  request() {
    window[this.name] = data => {
      this.cb(data);
      this.newWin.close();
      window[name] = null;
      delete window[name];
    };
    this.newWin = window.open(this.url, this.name, this.options);
    this.newWin.assetUrl = this.assetUrl;

    return this.newWin;
  }
}

/**
 * window response
 * @param  {object}
 */
const respond = data => {
  const name = window.name;
  console.log('WINDOW OPENER', window.opener);
  if (window.opener && window.opener[name] && typeof window.opener[name] === 'function') {
    window.opener[name](data);
  }
};

/**
 * get query param from window location
 * @param  {string} query param
 * @return {string}
 */
function getQueryString(field) {
  const href = window.location.href;
  const reg = new RegExp(`[?&]${field}=([^&#]*)`, 'i');
  const string = reg.exec(href);
  return string ? string[1] : null;
}

/**
 * attach handlers to dom
 */
const handlePopup = () => {
  if (!window.opener) {
    return;
  }

  if (getQueryString('popup') && getQueryString('addInput')) {
    $('#id_name').val(getQueryString('addInput'));
  }

  $('.close-popup').click(e => {
    window.close();
  });

  $('.widget-popup-data').each((i, dom) => {
    respond($(dom).data());
  });

  $('.crop-info').attr('data-asset-url', window.assetUrl);
};

/**
 * For Click to open window
 * @param  {object} event
 * @param  {Function} callback
 */
const clickOpenPopup = (e, cb, params = {}) => {
  e.preventDefault();
  console.log(params);
  const assetUrl = params.url;
  const url = $(e.currentTarget).attr('href');
  const options =
    'menubar=no,location=no,resizable=no,scrollbars=yes,status=no,height=500,width=800';
  const windowPopup = new WindowPopup(
    url,
    'assetWindow',
    options,
    data => {
      cb(data);
    },
    assetUrl,
  );
  windowPopup.request();

  return false;
};

export default WindowPopup;
export { handlePopup, clickOpenPopup, respond };
