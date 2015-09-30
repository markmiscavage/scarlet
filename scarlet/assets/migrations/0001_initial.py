# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import scarlet.assets.fields
import scarlet.assets.utils
import taggit.managers


class Migration(migrations.Migration):

    dependencies = [
        ('taggit', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Asset',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(max_length=255)),
                ('file', scarlet.assets.fields.AssetRealFileField(upload_to=scarlet.assets.utils.assets_dir)),
                ('type', models.CharField(db_index=True, max_length=255, choices=[(b'unknown', b'Unknown'), (b'image', b'Image'), (b'document', b'Document'), (b'audio', b'Audio'), (b'video', b'Video')])),
                ('slug', models.SlugField(unique=True, max_length=255)),
                ('user_filename', models.CharField(max_length=255)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('modified', models.DateTimeField(auto_now=True)),
                ('cbversion', models.PositiveIntegerField(editable=False)),
                ('tags', taggit.managers.TaggableManager(to='taggit.Tag', through='taggit.TaggedItem', help_text='A comma-separated list of tags.', verbose_name='Tags')),
            ],
            options={
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='ImageDetail',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('width', models.PositiveIntegerField()),
                ('height', models.PositiveIntegerField()),
                ('name', models.CharField(max_length=255)),
                ('editable', models.BooleanField(default=False, editable=False)),
                ('x', models.PositiveIntegerField(null=True)),
                ('x2', models.PositiveIntegerField(null=True)),
                ('y', models.PositiveIntegerField(null=True)),
                ('y2', models.PositiveIntegerField(null=True)),
                ('image', models.ForeignKey(to='assets.Asset')),
            ],
            options={
                'abstract': False,
            },
            bases=(models.Model,),
        ),
    ]
