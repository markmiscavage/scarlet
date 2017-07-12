from rest_framework import serializers

from . import models


class HotSpotSerializser(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    x = serializers.SerializerMethodField()
    y = serializers.SerializerMethodField()

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

    class Meta:
        model = models.HotSpot
        fields = ('label', 'image', 'text', 'x', 'y')


class HotSpotModuleSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    hotspots = serializers.SerializerMethodField()

    def get_hotspots(self, obj):
        return [HotSpotSerializser(item).data for item in obj.hotspots.all().order_by('order')]

    def get_image(self, obj):
        if obj.image:
            return obj.image_cache.url
        return ''

    class Meta:
        model = models.HotSpotModule
        fields = ('image', 'hotspots')
