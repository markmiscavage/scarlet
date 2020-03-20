from django.db import models
from cache import cache_manager
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver


class FancyModel(models.Model):
    text = models.TextField()


cache_manager.register_model(
    "fancy_model", FancyModel, values=["content"], instance_values=["pk"]
)

# invalidate cache
@receiver(post_save, sender=FancyModel)
@receiver(pre_delete, sender=FancyModel)
def invalidate_fancymodel(sender, **kwargs):
    cg = cache_manager.get_group("fancy_model")
    cg.invalidate_cache(FancyModel, instance=sender)
