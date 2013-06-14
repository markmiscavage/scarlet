from django.dispatch import Signal


# Signal sent after a file is saved into filesystem.
# sender is the file path
file_saved = Signal()
file_removed = Signal()
