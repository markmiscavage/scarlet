import { View } from 'backbone';

class Editor {
  render(el) {
    this.form = $('form[data-form-id=edit]');
    this.$el = $(el);

    var quill = new Quill(el, {
      modules: {
        toolbar: [
          [{ header: [1, 2, false] }],
          ['bold', 'italic', 'underline'],
          [{ script: 'sub' }, { script: 'super' }],
          ['link', 'image'],
          [{ list: 'ordered' }, { list: 'bullet' }]
        ]
      },
      theme: 'snow',
    });
    
    var text = quill.getText();   
    console.log(text); 
    this.$el.find('.ql-editor').html(text);
    this.addListeners();
  }

  addListeners() {
    this.form.find('input[type="submit"]').on('click', this.onSubmit.bind(this));
  }

  onSubmit(e) {
    e.preventDefault();
    var content = this.$el.find('.ql-editor').html();
    console.log(content); 
    var id = this.$el.parent().attr('data-label-for').substring(3); // remove id_
    this.$el.append('<textarea style="display:none;" name="'+id+'">'+content+'</textarea>');
    this.form.submit();
  }
};

export default Editor;
