import { ChangeEvent, useEffect, useRef, useState } from "react";

import "./App.css";
import { TagStore, Trie } from "./TagStore";

const debounce = (callback: (...callbackArgs: any) => void, wait: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: []) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback.apply(null, args);
    }, wait);
  };
};

interface ValidateDataFailure<T> {
  success: false;
  error: {
    message: string;
  };
}

interface ValidateDataSuccess<T> {
  success: true;
  data: T;
}

type ValidateData<T> = ValidateDataFailure<T> | ValidateDataSuccess<T>;

export function App() {
  const contentIDRef = useRef<HTMLInputElement>(null);
  const contentTagsStringRef = useRef<HTMLInputElement>(null);

  const tagStoreRef = useRef<TagStore>(null);
  if (tagStoreRef.current === null) {
    tagStoreRef.current = new TagStore();
  }

  const [contentTagsAutoSuggestions, setContentTagsAutoSuggestions] = useState<
    Array<string>
  >([]);
  function resetContentTagsAutoSuggestions() {
    setContentTagsAutoSuggestions([]);
  }
  const contentTagsOnChangeHandler = (event: ChangeEvent<HTMLInputElement>) => {
    setContentTagsAutoSuggestions(() => []);
    const newValue = event.target.value;
    let tag: string = newValue.trim();
    if (newValue.includes(",")) {
      console.log("[contentTagsOnChangeHandler] newValue", newValue);
      const validation = validateContentTags(newValue);
      console.log("[contentTagsOnChangeHandler] validation", validation);
      if (!validation.success) {
        return;
      }
      const tags = validation.data;
      console.log("[contentTagsOnChangeHandler] tags", tags);
      const outerMostTag = tags[tags.length - 1];
      // if (outerMostTag.length < 3) {
      //   return;
      // }
      tag = outerMostTag;
      // console.log(
      //   "[contentTagsOnChangeHandler]",
      //   tagStoreRef.current!.exportJSON()
      // );
    }
    console.log("[contentTagsOnChangeHandler] tag", tag);
    const suggestions = tagStoreRef.current!.suggest(tag);
    const suggestions2 = tagStoreRef.current!.trie.suggest(tag);
    console.log("[contentTagsOnChangeHandler] suggestions", suggestions);
    setContentTagsAutoSuggestions(() => suggestions);
  };

  function validateContentID(contentID: string): ValidateData<string> {
    if (typeof contentID !== "string") {
      return {
        success: false,
        error: {
          message: "contentID must be a string",
        },
      };
    }
    if (!contentID || !contentID.length) {
      return {
        success: false,
        error: {
          message: "contentID must be a valid string",
        },
      };
    }
    const contentIDTrimmed = contentID.trim();
    if (!contentIDTrimmed || !contentIDTrimmed.length) {
      return {
        success: false,
        error: {
          message: "contentID must be a valid string",
        },
      };
    }
    return {
      success: true,
      data: contentIDTrimmed,
    };
  }

  function validateContentTags(tagsStr: string): ValidateData<Array<string>> {
    if (typeof tagsStr !== "string") {
      return {
        success: false,
        error: {
          message: "tags must be a string",
        },
      };
    }
    if (!tagsStr || !tagsStr.length) {
      return {
        success: false,
        error: {
          message: "tags must be a valid string",
        },
      };
    }
    if (!tagsStr.trim() || !tagsStr.trim().length) {
      return {
        success: false,
        error: {
          message: "tags must be a valid string",
        },
      };
    }
    const tags = tagsStr.split(",");
    const filteredTagsSet = new Set<string>();
    for (const tag of tags) {
      const tagTrimmed = tag.trim();
      if (tagTrimmed && tag.length > 0 && !filteredTagsSet.has(tagTrimmed)) {
        filteredTagsSet.add(tagTrimmed);
      }
    }
    if (!filteredTagsSet.size) {
      return {
        success: false,
        error: {
          message:
            "tags must be a valid Array<string> & each string must be of length > 0",
        },
      };
    }
    return {
      success: true,
      data: Array.from(filteredTagsSet),
    };
  }

  const [isButtonDisabled, setButtonDisabled] = useState<boolean>(false);

  function buttonOnClickHandler() {
    resetContentTagsAutoSuggestions();
    setButtonDisabled(true);
    const contentIDValidation = validateContentID(contentIDRef.current!.value);
    if (!contentIDValidation.success) {
      alert(contentIDValidation.error.message);
      setButtonDisabled(false);
      return;
    }
    const contentTagsValidation = validateContentTags(
      contentTagsStringRef.current!.value
    );
    if (!contentTagsValidation.success) {
      alert(contentTagsValidation.error.message);
      setButtonDisabled(false);
      return;
    }
    contentIDRef.current!.value = "";
    contentTagsStringRef.current!.value = "";

    const contentID = contentIDValidation.data;
    const contentTags = contentTagsValidation.data;

    tagStoreRef.current!.addTags(contentTags, contentID);

    console.log(tagStoreRef.current!.exportJSON());
    setButtonDisabled(false);
  }

  function handleContentTagSuggestionClick(suggestion: string) {
    const contentTagsStringInputVal = contentTagsStringRef.current!.value;
    const contentTagsStringInputValCount = contentTagsStringInputVal.length;
    if (!contentTagsStringInputValCount) {
      contentTagsStringRef.current!.value = suggestion;
      return;
    }
    if (contentTagsStringInputVal.endsWith(",")) {
      contentTagsStringRef.current!.value = `${contentTagsStringInputVal}${suggestion}`;
      return;
    }
    contentTagsStringRef.current!.value = `${contentTagsStringInputVal},${suggestion}`;
    resetContentTagsAutoSuggestions();
  }

  return (
    <>
      <h1>Bookmarks Manager</h1>
      {/* <p>Edit <code>src/App.tsx</code> to get started!</p> */}
      <section className="flex column justifyContentBetween gap-8">
        <section className="flex row justifyContentBetween gap-8">
          <label htmlFor="contentID">ContentID</label>
          <input type="text" id="contentID" ref={contentIDRef} />
        </section>
        <section className="flex row justifyContentBetween gap-8">
          <label htmlFor="tags">Tags (comma separated)</label>
          <input
            type="text"
            id="tags"
            ref={contentTagsStringRef}
            onChange={contentTagsOnChangeHandler}
          />
        </section>

        <section className="flex row justifyContentBetween gap-8">
          <button disabled={isButtonDisabled} onClick={buttonOnClickHandler}>
            Add ContentID with Tags
          </button>
          {contentTagsAutoSuggestions.length ? (
            <section className="flex column gap-8">
              {contentTagsAutoSuggestions.map((suggestion) => {
                return (
                  <div
                    key={suggestion}
                    className="bg-grey-1 spacing-8 border-radius-8 cursor-pointer"
                    onClick={() => handleContentTagSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </div>
                );
              })}
            </section>
          ) : null}
        </section>
      </section>
    </>
  );
}
