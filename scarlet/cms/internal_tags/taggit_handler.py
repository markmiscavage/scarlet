import re

from django.db import models
from django.contrib.contenttypes.models import ContentType

from . fields import TaggedRelationFormField

from taggit.models import Tag, TaggedItem
from taggit.managers import TaggableManager


def get_model():
    return Tag


def get_tag_manager():
    return TaggableManager()


def tokenize_tags(tags_string):
    """
    This function is responsible to extract usable tags from a text.
    :param tags_string: a string of text
    :return: a string of comma separated tags
    """

    # text is parsed in two steps:
    # the first step extract every single world that is 3 > chars long
    # and that contains only alphanumeric characters, underscores and dashes
    tags_string = tags_string.lower().strip(",")
    single_words = set([w[:100] for w in re.split(';|,|\*|\n| ', tags_string)
                          if len(w) >= 3 and re.match("^[A-Za-z0-9_-]*$", w)])
    # the second step divide the original string using comma as separator
    comma_separated = set([t[:100] for t in tags_string.split(",") if t])
    # resulting set are merged using union
    return list(single_words | comma_separated)


def tags_to_string(tags):
    return ','.join(tags).lower()


def set_auto_tags_for_form(form, auto_tags):
    for name, field in form.fields.items():
        if isinstance(field, TaggedRelationFormField) and \
                    name in form.changed_data and \
                    form.cleaned_data.get(name):
            form.cleaned_data[name].auto_tags = auto_tags


def set_auto_tags_for_formset(formset, auto_tags):
    for form in formset:
        set_auto_tags_for_form(form, auto_tags)


def update_changed_tags(new_tags, old_tags):
    args = None
    for tag in old_tags:
        q = models.Q(tag__name=tag)
        if not args:
            args = q
        else:
            args = q | args

    types = TaggedItem.objects.filter(args).values(
        'content_type', 'object_id').annotate(
        cs=models.Count('content_type')).filter(cs=len(old_tags))
    add_tags = [Tag.objects.get_or_create(name=tag) for tag in new_tags]

    mapping = {}
    for t in types:
        if not t['content_type'] in mapping:
            mapping[t['content_type']] = []
        mapping[t['content_type']].append(t['object_id'])

    for t, ids in mapping.items():
        t = ContentType.objects.get_for_id(t)
        m = t.model_class()
        for ins in m.objects.filter(pk__in=ids):
            ins.tags.add(tag)


def get_tags_from_data(data, view_tags):
    view_tags = set(tokenize_tags(','.join(view_tags)))
    old_tags = set(tokenize_tags(data.get('view_tags', '')))
    auto_tags = set(tokenize_tags(data.get('auto_tags', '')))
    changed_tags = set(view_tags).difference(old_tags)
    if changed_tags:
        auto_tags = changed_tags.union(auto_tags)

    return set(auto_tags), changed_tags, old_tags
