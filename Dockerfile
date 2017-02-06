FROM ubuntu:14.04

MAINTAINER sysadmin@fairtradex.com

# Enable EPEL for Node.js
RUN \
  apt-get update && \
  apt-get -y upgrade && \
  apt-get install -y nodejs npm

# Copy app to /src
ADD . /src
COPY . /src

# Install app and dependencies into /src
RUN cd /src 
RUN npm install
EXPOSE 3001
WORKDIR /src
CMD ["npm", "start"]
