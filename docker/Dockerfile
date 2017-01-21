FROM python:3.6

RUN mkdir -p /srv/active

VOLUME /srv/active

EXPOSE 8000 80

RUN pip install Django==1.9.7
RUN pip install django-taggit==0.18.0
RUN pip install pip psycopg2==2.4.5
RUN pip install future
RUN pip install ipdb==0.10.1

CMD ["/bin/bash"]
