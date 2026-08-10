from pathlib import Path
p=Path('/home/ubuntu/whatsapp-number-extraction/DEPLOYMENT.md')
s=p.read_text()
s=s.replace('\\n', '\n')
p.write_text(s)
