# Open Source Release Checklist

**Project**: X402 Insurance Protocol V2  
**Target**: Public GitHub Repository  
**License**: CC BY-NC 4.0 (Non-Commercial)  
**Date**: 2025-10-31

---

## ✅ Completed Tasks

### Documentation
- [x] README.md created with comprehensive overview
- [x] SETUP.md with detailed setup instructions
- [x] CONTRIBUTING.md with contribution guidelines
- [x] LICENSE updated to CC BY-NC 4.0 (non-commercial)
- [x] SECURITY.md for responsible disclosure
- [x] SECURITY_AUDIT_REPORT.md for transparency

### Security Review
- [x] Code reviewed for vulnerabilities
- [x] Identified sensitive data (private keys in test scripts)
- [x] Created comprehensive .gitignore
- [x] Added security disclaimers
- [x] Documented audit status (NOT AUDITED)

### License Compliance
- [x] Non-commercial license applied (CC BY-NC 4.0)
- [x] Explicitly prohibits commercial use
- [x] Allows educational and research use
- [x] Proper attribution requirements

---

## ⚠️ CRITICAL - Before Push

### 1. Remove Sensitive Files

**Status**: ❌ **MUST DO BEFORE PUSH**

```bash
# DO NOT commit these files:
contracts/.env                    # Contains real private key!
services/.env                     # Contains 3 real private keys!

# Verify they're in .gitignore:
grep -q "^\.env$" .gitignore && echo "✅ .env blocked" || echo "❌ ADD TO .gitignore"
```

**Action Required**:
```bash
# Remove from current staging
git rm --cached contracts/.env services/.env

# Verify not in git
git status | grep -E "\.env" && echo "❌ STILL TRACKED!" || echo "✅ Safe"
```

### 2. Sanitize Test Scripts

**Status**: ⚠️ **RECOMMENDED**

**Files with Hardcoded Private Keys**:
- `test-success-simple.sh` (line 13, 15)
- `test-complete-success-flow.sh` (line 21, 23)
- `wait-and-claim.sh` (line 17)

**Options**:

**Option A - Environment Variables** (Recommended):
```bash
# Replace hardcoded keys with:
PROVIDER_KEY="${PROVIDER_PRIVATE_KEY:-0x0000000000000000000000000000000000000000000000000000000000000000}"
CLIENT_KEY="${CLIENT_PRIVATE_KEY:-0x0000000000000000000000000000000000000000000000000000000000000000}"
```

**Option B - Remove Exact Scripts** (Quick):
```bash
# Move to examples/ directory
mkdir examples/
mv test-*.sh examples/
echo "See examples/ for reference scripts (configure with your own keys)" > examples/README.md
```

**Option C - Keep As-Is** (Document):
- Add warning comment at top of each script
- Mention in README that keys are testnet-only
- Note: Still exposes testnet accounts

### 3. Rotate Private Keys

**Status**: ⚠️ **RECOMMENDED**

The following private keys are exposed in git/scripts:

| Address | Exposed In | Balance | Risk |
|---------|-----------|---------|------|
| 0x5dE57AAB23591E14d47c88dE24b7edC4Ad243839 | contracts/.env, test scripts | ~50 USDC | HIGH |
| 0xDf1f5C7ADECfbaD3B0F5aD4522DbB089F0a6e253 | test scripts | ~2 USDC | MEDIUM |
| Multiple others | services/.env | Varies | MEDIUM |

**Action**:
```bash
# 1. Generate new accounts
cast wallet new

# 2. Transfer funds from old accounts to new
cast send --from 0x5dE57...

# 3. Update .env files (DON'T COMMIT!)

# 4. Update contract ownership if needed
cast send $INSURANCE "setPlatformTreasury(address)" NEW_ADDRESS
```

### 4. Clean Git History

**Status**: ⚠️ **IF .env WAS EVER COMMITTED**

Check if .env was previously committed:
```bash
git log --all --full-history -- "*/.env"
```

If YES, clean history:
```bash
# Option 1: BFG Repo Cleaner (easiest)
bfg --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Option 2: git filter-branch
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch **/.env' \
  --prune-empty --tag-name-filter cat -- --all
```

---

## 📋 Pre-Push Checklist

Run these commands before pushing:

```bash
# 1. Verify .env files are NOT tracked
git ls-files | grep "\.env$" && echo "❌ DANGER: .env tracked!" || echo "✅ Safe"

# 2. Check for private keys in code
grep -r "0x[a-f0-9]{64}" --exclude-dir=node_modules --exclude-dir=.git . | grep -v ".md" && echo "⚠️ Check these!" || echo "✅ No keys found"

# 3. Verify .gitignore exists and is correct
test -f .gitignore && grep -q "^\.env$" .gitignore && echo "✅ .gitignore OK" || echo "❌ Fix .gitignore"

# 4. Check file permissions (no private keys readable)
find . -name "*.key" -o -name "*.pem" 2>/dev/null && echo "⚠️ Check these!" || echo "✅ No key files"

# 5. Verify LICENSE is non-commercial
head -1 LICENSE | grep -q "NonCommercial" && echo "✅ License OK" || echo "❌ Check LICENSE"
```

---

## 🚀 Repository Setup

### GitHub Repository Settings

**Recommended Settings**:
- [ ] Repository name: `X402-Insurance-V2` or similar
- [ ] Description: "Zero-fee insurance protocol for Web3 API payments (Testnet/Educational)"
- [ ] Public visibility
- [ ] Initialize with README: NO (we have our own)
- [ ] Add .gitignore: NO (we have our own)
- [ ] Add LICENSE: NO (we have CC BY-NC 4.0)

**Topics to Add**:
```
blockchain, smart-contracts, web3, insurance, defi, solidity, foundry, 
base-chain, payment-protocol, eip712, testnet, educational
```

**Important Labels**:
- `not-audited` - Security warning
- `testnet-only` - Not for production
- `educational` - Learning purposes
- `non-commercial` - CC BY-NC 4.0

### Repository Protection

**Branch Protection Rules** (for `main`):
- [ ] Require pull request reviews
- [ ] Require status checks
- [ ] Require conversation resolution
- [ ] Do not allow force pushes
- [ ] Do not allow deletions

---

## 📝 Post-Push Tasks

### 1. Create Initial Release

```bash
git tag -a v2.0.0-testnet -m "Initial testnet release - NOT AUDITED"
git push origin v2.0.0-testnet
```

Release notes should include:
- ⚠️ NOT AUDITED - Testnet only
- Features implemented
- Known limitations
- Setup instructions link
- Security disclaimer

### 2. Update Repository Settings

- [ ] Add repository description
- [ ] Add topics/tags
- [ ] Enable Issues
- [ ] Enable Discussions (optional)
- [ ] Add SECURITY.md to Security tab
- [ ] Pin README.md

### 3. Create Initial Issues

Suggested issues to create:
- [ ] "Security Audit Needed" (high priority)
- [ ] "Add Foundry Unit Tests" (good first issue)
- [ ] "Multi-token Support" (enhancement)
- [ ] "Documentation Improvements" (help wanted)

### 4. Announce Release

Where to share:
- [ ] Twitter/X (with disclaimers)
- [ ] Reddit (r/ethdev, r/defi)
- [ ] Dev.to / Medium article
- [ ] Discord communities (Foundry, Base)

**Sample Announcement**:
```
🚀 Open sourced X402 Insurance Protocol V2!

A novel insurance model for Web3 API payments:
- Zero fees for clients
- Provider bonds for protection  
- Automatic compensation on failures

⚠️ Educational/testnet only - NOT audited yet

License: CC BY-NC 4.0 (non-commercial)
GitHub: [your-repo-url]

#web3 #defi #blockchain #opensource
```

---

## ⚠️ Known Issues to Disclose

### In README / Documentation

1. **Not Audited**: 
   ```
   ⚠️ This smart contract has NOT been professionally audited.
   DO NOT deploy to mainnet or use with real funds.
   ```

2. **Testnet Only**:
   ```
   🧪 This project is for educational and testing purposes only.
   Current deployment: Base Sepolia Testnet
   ```

3. **License Restrictions**:
   ```
   📄 CC BY-NC 4.0: Non-commercial use only
   For commercial licensing, contact maintainers
   ```

4. **Private Keys in Scripts**:
   ```
   🔑 Test scripts contain example private keys (testnet only)
   Never use these keys on mainnet or with real funds
   Replace with your own keys for testing
   ```

---

## 📊 Final Verification

Before making repository public, verify:

```bash
#!/bin/bash
echo "🔍 Pre-Open Source Verification..."
echo ""

# 1. Check for .env files
if git ls-files | grep -q "\.env$"; then
    echo "❌ CRITICAL: .env files are tracked in git!"
    exit 1
else
    echo "✅ No .env files tracked"
fi

# 2. Check for private keys (excluding docs)
KEYS=$(grep -r "0x[a-f0-9]{64}" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" . | wc -l)
if [ "$KEYS" -gt 5 ]; then
    echo "⚠️  WARNING: Found $KEYS potential private keys (check manually)"
else
    echo "✅ Minimal hardcoded keys found ($KEYS)"
fi

# 3. Verify .gitignore
if [ -f .gitignore ] && grep -q "^\.env$" .gitignore; then
    echo "✅ .gitignore properly configured"
else
    echo "❌ CRITICAL: .gitignore missing or incorrect!"
    exit 1
fi

# 4. Verify LICENSE
if [ -f LICENSE ] && grep -q "NonCommercial" LICENSE; then
    echo "✅ CC BY-NC 4.0 license present"
else
    echo "❌ LICENSE missing or incorrect!"
    exit 1
fi

# 5. Verify README
if [ -f README.md ] && grep -q "NOT AUDITED" README.md; then
    echo "✅ README has security warnings"
else
    echo "⚠️  README missing audit warning"
fi

# 6. Verify SECURITY.md
if [ -f SECURITY.md ]; then
    echo "✅ SECURITY.md present"
else
    echo "⚠️  SECURITY.md missing (recommended)"
fi

echo ""
echo "🎯 Verification complete!"
echo ""
echo "If all checks pass, you're ready to:"
echo "  1. Create new GitHub repository"
echo "  2. git remote add origin <url>"
echo "  3. git push -u origin main"
echo ""
echo "⚠️  FINAL REMINDER: Double-check no private keys in history!"
```

Save as `pre-push-check.sh`, run before push:
```bash
chmod +x pre-push-check.sh
./pre-push-check.sh
```

---

## 🎉 Ready to Open Source!

Once all critical items are resolved:

```bash
# 1. Initialize git (if not already)
git init
git add .
git commit -m "Initial commit: X402 Insurance Protocol V2"

# 2. Create GitHub repository (via web interface)

# 3. Add remote and push
git remote add origin https://github.com/your-username/X402-Insurance-V2.git
git branch -M main
git push -u origin main

# 4. Create release
git tag -a v2.0.0-testnet -m "Initial testnet release - Educational use only"
git push origin v2.0.0-testnet
```

---

## 📞 Support Channels

After open sourcing, set up:
- [ ] GitHub Issues (bug reports, features)
- [ ] GitHub Discussions (Q&A, ideas)
- [ ] Email: opensource@[your-domain].com
- [ ] Twitter: @[your-handle]

---

**Status**: Ready for open source pending cleanup ✅

**Last Updated**: 2025-10-31

**Next Steps**: 
1. Remove .env files from tracking
2. (Optional) Sanitize test scripts
3. (Optional) Rotate testnet keys
4. Run pre-push-check.sh
5. Create GitHub repository
6. Push code
7. Announce release!
