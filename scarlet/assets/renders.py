from cms import renders
from assets import settings
from sorl.thumbnail import get_thumbnail


class AssetRenderer(renders.ChoicesRender):
    def get_object_list(self, adm_list):
        l = []
        for row in adm_list:
            o = row.instance

            try:
                thumbnail = get_thumbnail(o.file.file,
                                          settings.CMS_THUMBNAIL_SIZE).url
            except:
                thumbnail = None

            data = {
                'id': o.pk,
                'user_filename': o.user_filename,
            }
            if thumbnail:
                data['thumbnail'] = thumbnail

            l.append(data)

        return l

    def get_fields(self, fields):
        data = {
            'user_filename': {
                'sortable': False,
                'order_type': '',
                'name': 'User Filename'
            },
            'thumbnail': {
                'sortable': False,
                'order_type': '',
                'name': 'Thumbnail'
            }
        }
        return data, []
