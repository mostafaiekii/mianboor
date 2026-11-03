#!/bin/bash
cd /home/z/my-project/tmp-analysis
declare -A MAP=(
  [1]="tPBoMZfVOD" [2]="t1bYBvy6v3" [3]="vyl2HwLetO" [4]="FKBJ7Qmwxl"
  [5]="qmH8ebtXZo" [6]="BZNucJX4BF" [7]="NWvYjFjpWK" [8]="MvUT2sQC9M"
  [9]="DRCwuRJELS" [10]="Ghav6w0gbK" [11]="yCtWQZNvdh" [12]="dxPynZWCC2" [13]="oLBVKqhsiP"
)
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13; do
  code="${MAP[$i]}"
  agent-browser open "https://www.picofile.com/f/${code}/photo-${i}-2026-11-02-21-37-17.jpg" > /dev/null 2>&1
  sleep 1.5
  # click via eval on the button containing the Persian text (match by substring)
  agent-browser eval "var b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('لینک دانلود')); if(b){b.click()}; b?'CLICKED':'NOBTN'" > /dev/null 2>&1
  sleep 2
  url=$(agent-browser eval "var el=document.querySelector('input');el?el.value:'NOTFOUND'" 2>/dev/null | head -1 | tr -d '"')
  echo "PHOTO-${i}: $url"
  if [[ "$url" == https* ]]; then
    curl -sL --max-time 60 "$url" -o "photo-${i}.jpg"
  fi
done
echo "====="; file photo-*.jpg
