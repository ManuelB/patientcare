#!/bin/bash
#  ssh -i ~/.ssh/aws_rsa ec2-user@ec2-3-127-149-74.eu-central-1.compute.amazonaws.com
sudo yum update -y
sudo yum install httpd -y
# https://docs.aws.amazon.com/de_de/AWSEC2/latest/UserGuide/SSL-on-amazon-linux-2.html
sudo systemctl start httpd && sudo systemctl enable httpd
sudo yum install -y mod_ssl
# https://docs.aws.amazon.com/de_de/AWSEC2/latest/UserGuide/SSL-on-amazon-linux-2.html#letsencrypt
sudo wget -r --no-parent -A 'epel-release-*.rpm' http://dl.fedoraproject.org/pub/epel/7/x86_64/Packages/e/
sudo rpm -Uvh dl.fedoraproject.org/pub/epel/7/x86_64/Packages/e/epel-release-*.rpm
sudo yum-config-manager --enable epel*
# Configure domain name for a domain
# for testing:
# nslookup patientcare.incentergy.de
# vi /etc/httpd/conf/httpd.conf
#Listen 80
#<VirtualHost *:80>
#    DocumentRoot "/home/ec2-user/patientcare/frontend"
#    ServerName "patientcare.incentergy.de"
#    # ServerAlias "www.example.com"
#    ProxyPass "/users"  "http://localhost:8000/users"
#    ProxyPassReverse "/users"  "http://localhost:8000/users"
#    SSLProxyEngine On
#    SSLProxyCheckPeerName off
#    ProxyPass "/.well-known/openpgpkey/"  "https://localhost:8282/.well-known/openpgpkey/"
#    ProxyPassReverse "/.well-known/openpgpkey/"  "https://localhost:8282/.well-known/openpgpkey/"
#    ProxyPass "/authentication"  "http://localhost:8181/authentication"
#    ProxyPass "/jmap"  "http://localhost:8181/jmap"
#    ProxyPass "/download"  "http://localhost:8181/download"
#    ProxyPass "/upload"  "http://localhost:8181/upload"
#</VirtualHost>
#<Directory "/home/ec2-user/patientcare/frontend">
#        Require all granted
#</Directory>

sudo yum install -y certbot python2-certbot-apache
sudo certbot
# This will create /etc/httpd/conf/httpd-le-ssl.conf
sudo yum install -y git
git clone https://github.com/ManuelB/patientcare.git
chmod 755 .
chmod -R 755 patientcare
sudo yum install -y maven
# we need version 3.6 not 3.0.5
wget https://downloads.apache.org/maven/maven-3/3.6.3/binaries/apache-maven-3.6.3-bin.zip
unzip apache-maven-3.6.3-bin.zip
git clone https://github.com/ManuelB/james-project.git
cd james-project
git checkout feature/JAMES-3159-web-key-directory-protocol
# comment out  <release>${target.jdk}</release> in pom.xml (Fatal error compiling: invalid flag: --release)
sudo ../apache-maven-3.6.3/bin/mvn -DskipTests=true install
sudo systemctl stop postfix
sudo yum remove -y postfix 
sudo mvn exec:exec -Dexec.executable="java" -Dexec.args="-Dworking.directory=james -Dlogback.configurationFile=james/conf/logback.xml -classpath %classpath org.apache.james.MemoryJamesServerMain"
