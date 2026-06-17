import os
import time
import urllib.parse
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
import requests
from bs4 import BeautifulSoup

app = Flask(__name__, static_folder='static', template_folder='templates')

# In-memory cache
cache_data = {
    'time': 0,
    'feed_updated': '',
    'entries': []
}
CACHE_DURATION = 300  # 5 minutes in seconds

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    
    root = ET.fromstring(response.content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    feed_updated = root.find('atom:updated', ns)
    feed_updated_text = feed_updated.text if feed_updated is not None else ""
    
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        title_text = title.text if title is not None else ""
        
        updated = entry.find('atom:updated', ns)
        updated_text = updated.text if updated is not None else ""
        
        # Extract alternate link
        links = entry.findall('atom:link', ns)
        link_href = ""
        for link in links:
            if link.attrib.get('rel') == 'alternate' or not link.attrib.get('rel'):
                link_href = link.attrib.get('href', '')
                break
        
        content = entry.find('atom:content', ns)
        content_html = content.text if content is not None else ""
        
        soup = BeautifulSoup(content_html, 'html.parser')
        
        sub_entries = []
        h3_tags = soup.find_all('h3')
        if h3_tags:
            for idx, h3 in enumerate(h3_tags):
                category = h3.get_text(strip=True)
                
                # Sibling traversal to extract content under this h3 header
                sibling_html = []
                sibling = h3.next_sibling
                while sibling and sibling.name != 'h3':
                    if sibling.name:
                        # Ensure links open in a new tab
                        for a in sibling.find_all('a'):
                            a['target'] = '_blank'
                            a['rel'] = 'noopener noreferrer'
                        sibling_html.append(str(sibling))
                    elif isinstance(sibling, str) and sibling.strip():
                        sibling_html.append(sibling.strip())
                    sibling = sibling.next_sibling
                
                update_content = "".join(sibling_html)
                
                # Clean plain text summary for Twitter drafting
                desc_soup = BeautifulSoup(update_content, 'html.parser')
                plain_desc = desc_soup.get_text(separator=" ", strip=True)
                plain_desc = " ".join(plain_desc.split())
                
                sub_entries.append({
                    'id': f"{updated_text.split('T')[0]}_{idx}",
                    'category': category,
                    'content': update_content,
                    'plain_text': plain_desc
                })
        else:
            # Fallback if no specific categories (h3 tags) exist
            for a in soup.find_all('a'):
                a['target'] = '_blank'
                a['rel'] = 'noopener noreferrer'
            plain_desc = soup.get_text(separator=" ", strip=True)
            plain_desc = " ".join(plain_desc.split())
            sub_entries.append({
                'id': f"{updated_text.split('T')[0]}_0",
                'category': 'General',
                'content': str(soup),
                'plain_text': plain_desc
            })
            
        entries.append({
            'title': title_text,
            'updated': updated_text,
            'link': link_href,
            'updates': sub_entries
        })
        
    return {
        'feed_updated': feed_updated_text,
        'entries': entries
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache_data['entries'] or (current_time - cache_data['time'] > CACHE_DURATION):
        try:
            data = fetch_and_parse_feed()
            cache_data['entries'] = data['entries']
            cache_data['feed_updated'] = data['feed_updated']
            cache_data['time'] = current_time
        except Exception as e:
            # Fallback to cache if request fails but we have existing cache data
            if cache_data['entries']:
                return jsonify({
                    'status': 'fallback',
                    'error': str(e),
                    'feed_updated': cache_data.get('feed_updated', ''),
                    'entries': cache_data['entries']
                })
            return jsonify({'status': 'error', 'message': str(e)}), 500
            
    return jsonify({
        'status': 'success',
        'feed_updated': cache_data.get('feed_updated', ''),
        'entries': cache_data['entries']
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
