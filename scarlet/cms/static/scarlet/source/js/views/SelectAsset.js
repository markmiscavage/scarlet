import { View } from 'backbone';
import selectize from 'selectize';
import { clickOpenModal } from 'helpers/Modal';
import { clickOpenPopup } from 'helpers/WindowPopup';

const SelectAsset = View.extend({
  initialize() {
    this.$input = this.$('input');
    this.$preview = this.$('.asset__preview');
    this.$cropsList = this.$('.asset__crop-list');
    this.$selectizeInput = this.$input.after('<input />');
    this.baseLink = this.$cropsList.data('base-link');
    this.url = this.$el.data('api');
    this.addOpen = false;
    this.id = this.$input[0].defaultValue;

    if($('.asset__edit-link').length){
      this.baseUrl = $('.asset__edit-link').data().base;
    }
  },

  /**
   * Backbone Events Object
   */
  events: {
    'click .button, .asset__edit-link': 'handlePopup',
  },

  /**
   * Render View
   */
  render() {
    const options = {
      placeholder: 'Choose an asset',
      valueField: 'id',
      labelField: 'text',
      maxItems: 1,
      load: this.load.bind(this),
      preload: true,
      render: this.renderOption(),
      onItemAdd: this.onSelect.bind(this),
      onInitialize: this.initSelections.bind(this),
      onChange: this.onChange.bind(this),
    };
    this.$selectizeInput.selectize(options);
    this.tag();
    this.autoTag();
    this.linkifyCrops();
    $('.asset__edit-link').attr('href', `${this.baseUrl}${this.id}/edit`);
  },

  /**
   * Load Data
   * @param  {string}  input query
   * @param  {Function}  callback function
   * @return {function}  return callback
   */
  load(query, callback) {
    $.ajax({
      url: this.url,
      type: 'GET',
      dataType: 'json',
      error: () => {
        callback();
      },
      success: response => {
        const results = this.transformResults(response);
        callback(results);
      },
    });
  },

  /**
   * Set selections based on server rendered data
   */
  initSelections() {
    this.selectize = this.$selectizeInput[0].selectize;
    const thumb = this.$preview.data('src');
    const options = (this.options = {
      id: this.selectize.$input.val(),
      user_filename: this.$el.attr('data-title'),
      thumbnail: thumb,
      text: this.$el.attr('data-title'),
    });

    this.selectize.removeOption(options.id);
    this.setSelected(options);
  },

  /**
   * Trasnform Response Data
   * @param  {object}
   * @return {object}
   */
  transformResults(response) {
    this.fields = [];
    this.params = [];

    for (const field in response.fields) {
      this.fields.push(field);
    }
    return response.results.map(item => {
      item.text = item.user_filename;
      return item;
    });
  },

  /**
   * Selecting Asset from list
   * @param  {'string'}
   * @param  {object}
   */
  onSelect(value, $item) {
    $('.asset__edit-link').attr('href', `${this.baseUrl}${value}/edit`);
    this.linkifyCrops();
    this.$preview.css('background-image', `url(${$item.attr('data-thumb')})`);

    if ($item.attr('data-src')) {
      $('.asset__edit-link').removeClass('disabled button--disabled');
      this.$input.attr('data-src', $item.attr('data-src'));
    }
  },

  onChange() {
    this.linkifyCrops();

    if (!this.$input.val()) {
      this.$preview.css('background-image', 'none');
    }
  },

  /**
   * Prepare Selectize options
   * @return {object}
   */
  renderOption() {
    return {
      item: (item, escape) => {
        return `<div data-thumb="${escape(
          item.thumbnail,
        )}" data-id="${item.id}" data-src="${item.url}" >${escape(item.text)}</div>`;
      },
      option: (item, escape) => {
        const option =
          `<div class="select-asset__item" data-id="${item.id}">` +
          `<div style="background-image: url(${escape(
            item.thumbnail,
          )})" class="select-asset__image--thumb"></div><span class="select-asset__caption">${escape(
            item.text,
          )}</span></div>`;
        return option;
      },
    };
  },

  linkifyCrops() {
    const guidLink = this.baseLink + this.$cropsList.parent().find('[type=hidden]').val();
    this.$cropsList.find('li').each((i, el) => {
      const $el = $(el);
      const editLink = `${guidLink}/${$el.data('crop-link')}?popup=1`;
      $el.find('a').attr('href', editLink);
    });
  },

  /**
   * constructs param for tagging
   * @param  {obj}
   * @return {string}
   */
  constructParams(obj) {
    const params = [];
    for (const i in obj) {
      params.push(`${i}=${obj[i]}`);
    }
    return `?${params.join('&')}`;
  },

  /**
   * parsing query string
   * @param  {string}
   * @return {arra7}
   */
  destructParams(path) {
    const ret = {};
    const seg = path.replace(/^\?/, '').split('&');
    for (let i = 0, len = seg.length; i < len; i++) {
      if (!seg[i]) {
        continue;
      }
      const s = seg[i].split('=');
      ret[s[0]] = s[1];
    }
    return ret;
  },

  autoTag() {
    let tags = [];
    $('[data-auto-tag]').each((i, dom) => {
      const dataAutoTag = $(dom).data('auto-tag');
      if (dataAutoTag) {
        const allTags = dataAutoTag.toLowerCase().split(',');

        while (allTags.length) {
          const tag = allTags.shift();
          const splitTag = tag.split(' ');
          tags.push(tag);

          // if splitTag length > 3, push individual values
          if (tag.match(/[a-z0-9]/i) && splitTag.length > 3) {
            while (splitTag.length) {
              const newTag = splitTag.shift();
              if (tags.indexOf(newTag) === -1) {
                tags.push(newTag);
              }
            }
          }
        }
        tags = tags.concat(allTags);
      }
    });
    $('#auto_tags').val(tags.join(','));
    this.autoTags = tags;
  },

  tag() {
    if (!this.$('a.button').length) {
      return;
    }

    const node = this.$('a.button');
    const params = this.destructParams(node[0].search);
    let tags;
    if($(this.$el).data('tags')){
      tags = ($(this.$el).data('tags')).toLowerCase().split(',');
      // autoTags doesn't exist at this point so the following line can't work.
      //tags = tags.concat(this.autoTags); 
      params.tags = encodeURIComponent(tags.join(','));
    }    

    node[0].search = this.constructParams(params);
  },

  // Set Selected Image
  setSelected(options) {
    if (options.thumbnail) {
      this.selectize.addOption(options);
      this.selectize.setValue(options.id);
      this.addOpen = false;
    }
  },

  handlePopup(e) {
    if(!this.$input.attr('data-src') && $(e.currentTarget).is('.asset__edit-link')){
      e.preventDefault();
      return;
    }
    var windowSize = {
      'width': screen.width / 2,
      'height': screen.height
    };

    // clickOpenModal(e, 'modal-add-asset', this.setSelected.bind(this), this.autoTags)
    clickOpenPopup(e, this.setSelected.bind(this), windowSize);

    // LIST APPROACH
    // if(this.addOpen){
    //   e.preventDefault()
    // } else {
    //   this.addOpen = true
    //   clickOpenModal(e, 'modal-add-asset', this.setSelected.bind(this), this.autoTags)
    // }
  },
});

export default SelectAsset;
