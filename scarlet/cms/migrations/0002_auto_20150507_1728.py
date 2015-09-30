# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cmslog',
            name='action',
            field=models.PositiveIntegerField(choices=[(0, b'Save'), (2, b'Delete'), (3, b'Published'), (4, b'Unpublished'), (5, b'Scheduled')]),
        ),
    ]
