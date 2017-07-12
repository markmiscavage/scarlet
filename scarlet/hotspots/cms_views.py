from scarlet.cms import views, transaction
from scarlet.assets.models import Asset

from . import models


class HotSpotMainView(views.ListView):
    def get_context_data(self, **kwargs):
        context = super(HotSpotMainView, self).get_context_data(**kwargs)

        try:
            hotspot_module_id = kwargs.get('url_params').get(
                'hotspots_hotspots_pk')
            hotspot_module = models.HotSpotModule.objects.get(
                pk=hotspot_module_id)
            context.update({
                'hotspot_module': hotspot_module,
                'url': self.request.build_absolute_uri(),
            })
        except:
            pass

        return context

    def post(self, request, *args, **kwargs):
        label_lst = request.POST.getlist('label')
        x_coord_lst = request.POST.getlist('x-coord')
        y_coord_lst = request.POST.getlist('y-coord')
        images_lst = request.POST.getlist('image')
        text_lst = request.POST.getlist('text')
        video_lst = request.POST.getlist('video_json')
        svg_list = request.POST.getlist('svg')

        module_id = request.POST.get('module-id')

        module_obj = models.HotSpotModule.objects.get(pk=module_id)

        with transaction.commit_on_success():
            # Deleting first all hotspots for given module
            models.HotSpot.objects.filter(module=module_obj).delete()

            for idx, item in enumerate(label_lst):
                # Adding hotspot
                obj = models.HotSpot.objects.create(
                    x_cord=int(x_coord_lst[idx]),
                    y_cord=int(y_coord_lst[idx]),
                    label=label_lst[idx],
                    order=idx + 1,
                    module=module_obj,
                    text=text_lst[idx],
                    overlay_size_x=request.POST.get('overlay-size').split('-')[0],
                    overlay_size_y=request.POST.get('overlay-size').split('-')[1],
                    video_json=video_lst[idx],
                )

                if images_lst[idx] != u'':
                    obj.image = Asset.objects.get(pk=int(images_lst[idx]))
                    obj.svg = Asset.objects.get(pk=int(svg_list[idx]))
                    obj.save()
            return self.render(
                request, message='Hotspots saved', message_class='info', data={})
        return self.render(
            request, message='Error saving hotspots', message_class='error', data={})
