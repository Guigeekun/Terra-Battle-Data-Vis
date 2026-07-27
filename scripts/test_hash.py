import struct

target_warrior = -1902060987 # hex: 0x8ea254e5
target_archer = -1962633151  # hex: 0x8b04bc41

def to_signed_32(val):
    val = val & 0xffffffff
    if val >= 0x80000000:
        return val - 0x100000000
    return val

def net_get_hash_code_32(s):
    # s is a string (e.g. "CH1_WARRIOR")
    # Convert to 16-bit unicode chars
    chars = [ord(c) for c in s]
    # Pad to even length with 0 if necessary
    # But wait, standard .NET hash works on the char pointer
    length = len(chars)
    
    hash1 = (5381 << 16) + 5381
    hash2 = hash1
    
    # Process 4 characters (8 bytes, two 32-bit ints) at a time
    i = 0
    while length > 2:
        # pinKey[0]
        val1 = chars[i] | (chars[i+1] << 16)
        # pinKey[1]
        val2 = chars[i+2] | (chars[i+3] << 16) if i+3 < len(chars) else chars[i+2]
        
        hash1 = (((hash1 << 5) + hash1) ^ val1) & 0xffffffff
        hash2 = (((hash2 << 5) + hash2) ^ val2) & 0xffffffff
        i += 4
        length -= 4
        
    if length > 0:
        if i < len(chars):
            val1 = chars[i]
            if i+1 < len(chars):
                val1 |= (chars[i+1] << 16)
            hash1 = (((hash1 << 5) + hash1) ^ val1) & 0xffffffff
            
    res = (hash1 + (hash2 * 1566083941)) & 0xffffffff
    return to_signed_32(res)

print("C# 32-bit hash for CH1_WARRIOR:", net_get_hash_code_32("CH1_WARRIOR"))
print("C# 32-bit hash for CH1_ARCHER:", net_get_hash_code_32("CH1_ARCHER"))
print("Match Warrior:", net_get_hash_code_32("CH1_WARRIOR") == target_warrior)
print("Match Archer:", net_get_hash_code_32("CH1_ARCHER") == target_archer)
