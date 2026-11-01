#!/usr/bin/env python3
"""Append a block of string entries (JS object body) to strings.en.js before the closing brace."""
import sys
p = '/home/claude/propertyos/public/js/core/strings.en.js'
s = open(p, encoding='utf-8').read().rstrip()
assert s.endswith('};')
block = sys.stdin.read().rstrip('\n')
s = s[:-2].rstrip() + '\n' + block + '\n};\n'
open(p, 'w', encoding='utf-8').write(s)
