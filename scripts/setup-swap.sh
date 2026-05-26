#!/bin/bash
# Adds 2GB swap to reduce OOM kills during npm/vite builds on low-RAM servers.
set -e
if swapon --show | grep -q '/swapfile'; then
  echo "Swap already enabled:"
  swapon --show
  exit 0
fi
if [ -f /swapfile ]; then
  chmod 600 /swapfile
  mkswap /swapfile 2>/dev/null || true
else
  echo "Creating 2GB /swapfile (this may take a minute)..."
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
  chmod 600 /swapfile
  mkswap /swapfile
fi
swapon /swapfile
grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 60 > /proc/sys/vm/swappiness 2>/dev/null || true
grep -q '^vm.swappiness' /etc/sysctl.conf 2>/dev/null || echo 'vm.swappiness=60' >> /etc/sysctl.conf
echo "Swap enabled:"
swapon --show
free -h
