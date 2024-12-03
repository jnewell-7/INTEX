#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory

# Define your domains
DOMAINS="-d turtleshelter.us-east-1.elasticbeanstalk.com -d trtleproject.is404.net"

# Run Certbot to obtain or renew certificates for both domains
sudo certbot -n $DOMAINS --nginx --agree-tos --email jnewell7@byu.edu --expand --redirect

