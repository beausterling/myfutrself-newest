The script appears to have some duplicate code and missing closing brackets. Here's the corrected version with proper closures:

[Previous code remains the same until the first complete component definition]

After the first complete `ChooseVoice` component definition that ends with:

```javascript
  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* ... rest of JSX ... */}
    </div>
  );
};

export default ChooseVoice;
```

Remove the duplicate code that follows, as it appears to be a redundant copy of the component's implementation.

The main issue was that there were two complete implementations of the same component, with the second one being a partial duplicate. The file should end after the first complete implementation with the `export default ChooseVoice;` statement.