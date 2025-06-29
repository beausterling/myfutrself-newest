The file appears to be missing several closing brackets. Here's the corrected version with the missing brackets added:

```typescript
// ... (rest of the file remains the same until the end)

              {/* Information message when voice clone already exists */}
              {hasFinalVoiceId && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">ℹ️</span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-blue-400 font-semibold text-sm mb-2 font-heading">Custom Voice Already Created</h4>
                      <p className="text-blue-300 text-sm font-body">
                        You already have a personalized voice clone set up for your account. 
                        Only one custom voice is allowed per account to ensure the best quality and consistency.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChooseVoice;
```

I've added the missing closing brackets for:
1. The nested div elements
2. The conditional rendering blocks
3. The component function
4. The export statement

The structure is now properly closed and balanced.