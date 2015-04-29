try:
    from ..cms import renders
except ValueError:
    from cms import renders

from . import settings


class AssetRenderer(renders.ChoicesRender):
    def get_object_list(self, adm_list):
        l = []
        for row in adm_list:
            o = row.instance

            if hasattr(o.file, 'admin_url'):
                thumbnail = o.file.admin_url()

            data = {
                'id': o.pk,
                'user_filename': o.user_filename,
                'url': o.file.url
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
            },
            'url': {
                'sortable': False,
                'order_type': '',
                'name': 'Url'
            }
        }
        return data, []
