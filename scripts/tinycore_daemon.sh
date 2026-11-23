#!/bin/bash
mkdir -p /var/log/server

echo "[$(date)] Supervisor Dimulai..." >> /var/log/server/tinycore_daemon.log

while true; do
    # 1. Bansos AI Gateway (Port 17070)
    if ! pgrep -f "bansos" >/dev/null 2>&1; then
        echo "[$(date)] bansosd down, restarting..." >> /var/log/server/bansos_watchdog.log
        cd /var/www/bansos-router && nohup bansos start >> /var/log/server/bansos_watchdog.log 2>&1 &
    fi

    # 2. GoPay Partner Gateway (Port 3005)
    if [ -d "/var/www/gopay-gateway" ] && ! pgrep -f "/var/www/gopay-gateway/server.js" >/dev/null 2>&1; then
        echo "[$(date)] Starting GoPay Gateway on port 3005..." >> /var/log/server/tinycore_daemon.log
        cd /var/www/gopay-gateway && nohup node /var/www/gopay-gateway/server.js >> /var/log/server/gopay_gateway.log 2>&1 &
    fi

    # 3. Backend Terminal ttyd (Port 7682)
    if ! pgrep -f "ttyd.*7682" >/dev/null 2>&1; then
        echo "[$(date)] Starting ttyd on port 7682..." >> /var/log/server/tinycore_daemon.log
        nohup ttyd -p 7682 -W /bin/bash >> /var/log/server/ttyd.log 2>&1 &
    fi

    # 4. TinyCore Linux GUI Desktop (Port 7681)
    if ! pgrep -f "/var/www/tinycore-desktop/server.js" >/dev/null 2>&1; then
        echo "[$(date)] Starting TinyCore Desktop on port 7681..." >> /var/log/server/tinycore_daemon.log
        cd /var/www/tinycore-desktop && nohup node /var/www/tinycore-desktop/server.js >> /var/log/server/tinycore_desktop.log 2>&1 &
    fi

    # 5. OpenPlag Server (Port 5000)
    if [ -d "/var/www/openplag" ] && ! pgrep -f "/var/www/openplag/app.py" >/dev/null 2>&1; then
        echo "[$(date)] Starting OpenPlag on port 5000..." >> /var/log/server/tinycore_daemon.log
        cd /var/www/openplag && nohup python3 /var/www/openplag/app.py >> /var/log/server/openplag.log 2>&1 &
    fi

    # 6. OpenJurnal Server (Port 7860)
    if [ -d "/var/www/openjurnal" ] && ! pgrep -f "/var/www/openjurnal/app.py" >/dev/null 2>&1; then
        echo "[$(date)] Starting OpenJurnal on port 7860..." >> /var/log/server/tinycore_daemon.log
        cd /var/www/openjurnal && nohup python3 /var/www/openjurnal/app.py >> /var/log/server/openjurnal.log 2>&1 &
    fi

    # 7. OpenJob Server (Port 5050)
    if [ -d "/srv/openjob" ] && ! pgrep -f "openjob" >/dev/null 2>&1; then
        echo "[$(date)] Starting OpenJob on port 5050..." >> /var/log/server/tinycore_daemon.log
        cd /srv/openjob
        [ -d "/srv/openjob/job-auto-apply" ] && cd /srv/openjob/job-auto-apply
        nohup python3 /var/www/openjob/app.py >> /var/log/server/openjob.log 2>&1 &
    fi

    # 8. OpenQRIS Payment Gateway (Port 5060)
    if [ -d "/var/www/openqris" ] && ! pgrep -f "/var/www/openqris/server.js" >/dev/null 2>&1; then
        echo "[$(date)] Starting OpenQRIS on port 5060..." >> /var/log/server/tinycore_daemon.log
        cd /var/www/openqris && nohup node --experimental-sqlite /var/www/openqris/server.js >> /var/log/server/openqris.log 2>&1 &
    fi

    sleep 10
done
