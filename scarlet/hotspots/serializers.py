from rest_framework import serializers

from . import models


class HotSpotSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    x = serializers.SerializerMethodField()
    y = serializers.SerializerMethodField()
    pin_number = serializers.SerializerMethodField()
    pin_title = serializers.SerializerMethodField()
    icon = serializers.SerializerMethodField()

    def get_pin_number(self, obj):
        return obj.order

    def get_pin_title(self, obj):
        return obj.label

    def get_x(self, obj):
        # This value is relative to image size, returning %
        return '{0}%'.format(obj.x_cord * 100 / obj.overlay_size_x)

    def get_y(self, obj):
        # This value is relative to image size, returning %
        return '{0}%'.format(obj.y_cord * 100 / obj.overlay_size_y)

    def get_image(self, obj):
        if obj.image:
            return obj.image_cache.url
        return ''

    def get_icon(self, obj):
        if obj.icon:
            return obj.icon_cache.url
        return ''

    class Meta:
        model = models.HotSpot
        fields = (
            'pin_title', 'pin_number', 'image', 'text', 'x', 'y', 'icon',
            'video_json',
        )


class HotSpotModuleSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    hotspots = serializers.SerializerMethodField()

    def get_hotspots(self, obj):
        return [HotSpotSerializer(item).data for item in obj.hotspots.all().order_by('order')]

    def get_image(self, obj):
        if obj.image:
            return obj.image_cache.url
        return ''

    class Meta:
        model = models.HotSpotModule
        fields = ('image', 'name', 'intro_copy', 'hotspots')
