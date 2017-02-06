FROM ubuntu:14.04

MAINTAINER sysadmin@fairtradex.com

# Enable EPEL for Node.js  
RUN \
  apt-get update && \
  apt-get -y upgrade && \
  apt-get install -y nodejs npm && \
  apt-get install -y nodejs-legacy

# Copy app to /src
ADD . /binaries
COPY . /binaries

# Install app and dependencies into /src
RUN cd /binaries 
#RUN npm start
EXPOSE 3001 3012
WORKDIR /binaries
CMD ["npm", "start"]
