# Setting Up Environment

The environment is being prepared. This takes **2-3 minutes**.

Watch the terminal for progress. When you see **"READY"**, open the GUI.

**[Open Log Replay GUI]({{TRAFFIC_HOST1_3000}})**

## Using the GUI

1. Paste or upload a log file (max 10 lines)
2. Select the log type (NGINX, Syslog, or custom)
3. Click **Replay Logs** to see alerts and explanations

## Example Log Lines

**NGINX:**
```
192.168.1.1 - - [01/Jan/2024:00:00:00 +0000] "GET /admin HTTP/1.1" 200 512
```

**Syslog (SSH):**
```
Jan  1 00:00:00 server sshd[1234]: Failed password for root from 192.168.1.1 port 22 ssh2
```

## Troubleshooting

```bash
cat /var/log/setup.log            # Setup logs
cat /var/log/log-replay-gui.log   # GUI logs
sudo cscli collections list       # Check installed collections
sudo cscli alerts list            # Check alerts directly
```
