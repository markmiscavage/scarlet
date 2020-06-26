import { View } from 'backbone';

const BatchActions = View.extend({
  events: {
    'click [data-type=batch-check-all]': 'selectAll',
    'click [data-type=batch-check-row]': 'selectRow',
    'click [data-edit-url]': 'goToRowUrl',
  },

  initialize() {
    this.idList = [];    
    $.each(this.$el.find('td'), function(i, el){
      var str = $(el).text();
      str = str.replace(/\s/g, '').toLowerCase(); // remove space characters
      if(str === 'published' || str === 'unpublished'){
        var checkbox = $(el).parent().find('td.checkbox input');
        if(checkbox){
          checkbox.attr('data-status', str.toLowerCase())
        }
      }
    });
  },

  render() {
    this.$actions = this.$el.find('[data-type=batch-action]');
    this.$actionPublish = this.$el.find('[data-action=publish]');
    this.$actionUnpublish = this.$el.find('[data-action=unpublish]');
    this.$batchCheck = this.$el.find('[data-type=batch-check-row]');
    this.$selectAll = this.$el.find('[data-type=batch-check-all]');
    this.$actions.on('click', this.handleActions.bind(this));
  },

  selectAll(e) {
    var selectAllChecked = this.$selectAll.prop('checked');
    this.$batchCheck.each(function() {
      $(this).prop('checked', selectAllChecked);
    });

    if(selectAllChecked){
      this.enableActions();
    } else{
      this.disableActions();
    }
  },

  selectRow(e) {
    const id = $(e.currentTarget).val();
    const idIndex = this.idList.indexOf(id);

    if (idIndex > -1) {
      this.idList.splice(idIndex, 1);
    } else {
      this.idList.push(id);
    }

    this.toggleActions();
    this.updateActionUrl(idIndex);
  },

  handleActions(event){
    if($(event.currentTarget).is('.button--disabled')){
      event.preventDefault();
    }
  },

  toggleActions() {
    if (this.idList.length) {
      this.enableActions();
    } else {
      this.disableActions();
    }
  },

  enableActions() {

    var hasItemPublished, hasItemUnpublished
    $.each(this.$el.find('tbody td.checkbox input:checked'), function(i, checkbox){
      if($(checkbox).data('status') === "published"){
        hasItemPublished = true;
      } else if($(checkbox).data('status') === "unpublished"){
        hasItemUnpublished = true;
      }
    });

    this.$actions.removeClass('button--disabled').addClass('button--primary');
    if(hasItemPublished !== hasItemUnpublished){
      if(hasItemPublished){
        this.$actionPublish.addClass('button--disabled');
      } 
      
      if(hasItemUnpublished){
        this.$actionUnpublish.addClass('button--disabled');
      } 
    }
  },

  disableActions() {
    this.$actions.addClass('button--disabled').removeClass('button--primary');
    this.$selectAll.prop('checked', false);
  },

  updateActionUrl(index) {
    const self = this;

    this.$actions.each(function() {
      const $this = $(this);
      const href = $this.attr('href').replace(/(_selected=)[^\&]+/, '$1');
      $this.attr('href', href + self.idList.join(','));
    });
  },

  goToRowUrl() {
    window.location.href = this.$el.find('[data-edit-url]').data('edit-url');
  },
});

export default BatchActions;
