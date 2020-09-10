#!/usr/bin/env python

import os

from setuptools import setup
from setuptools.command.build_py import build_py

packages = []
base_path = os.path.abspath(os.path.dirname(__file__))


class my_build_py(build_py):
    def get_data_files(self):
        return build_py.get_data_files(self)

    def find_data_files(self, package, src_dir):
        files = []
        for dirpath, dirnames, filenames in os.walk(
            os.path.join(src_dir), topdown=True
        ):
            for i, dirname in enumerate(dirnames):
                if os.path.exists(os.path.join(src_dir, dirname, "__init__.py")):
                    del dirnames[i]

            if "__init__.py" not in filenames:
                files.extend(
                    [
                        os.path.join(dirpath, x)
                        for x in filenames
                        if not x.startswith(".")
                    ]
                )
        return files


def fullsplit(path, result=None, base_path=None):
    """
    Split a pathname into components (the opposite of os.path.join) in a
    platform-neutral way.
    """

    if base_path:
        path = path.replace(base_path, "")

    if result is None:
        result = []
    head, tail = os.path.split(path)
    if head == "":
        return [tail] + result
    if head == path:
        return result
    return fullsplit(head, [tail] + result)


for dirpath, dirnames, filenames in os.walk(
    os.path.join(base_path, "scarlet"), followlinks=False
):
    # Ignore dirnames that start with '.'
    for i, dirname in enumerate(dirnames):
        if dirname.startswith("."):
            del dirnames[i]

    if "__init__.py" in filenames:
        packages.append(".".join(fullsplit(dirpath, base_path=base_path)))

setup(
    name="scarletcms",
    version=__import__("scarlet").__version__,
    description="A replacement for the Django Admin, focused on Content Management",
    author="Mark Miscavage",
    author_email="mark.miscavage@wonderful.com",
    url="https://github.com/markmiscavage/scarlet",
    license="MIT",
    install_requires=["django-taggit==1.3.0", "django>=2.2.11,<3.0"],
    packages=packages,
    cmdclass={"build_py": my_build_py},
    classifiers=[
        "Development Status :: 4 - Beta",
        "Environment :: Web Environment",
        "Framework :: Django",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: POSIX",
        "Programming Language :: Python",
    ],
)
