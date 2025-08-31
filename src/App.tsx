import { ChangeEvent, useEffect, useRef, useState } from "react";

import "./App.css";
import { TagStore } from "./TagStore";
import type { ValidateData } from "./types/types-helpers";
import { validateString } from "./validators/string";

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

  const [selectedContentTags, setSelectedContentTags] = useState<Set<string>>(
    new Set()
  );

  function validateContentID(contentID: string): ValidateData<string> {
    return validateString(contentID, {
      key: "contentID",
    });
  }

  function validateContentTags(tagsStr: string): ValidateData<Array<string>> {
    const result = validateString(tagsStr, {
      key: "tagsStr",
    });
    if (!result.success) {
      return result;
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
  function enableButton() {
    setButtonDisabled(false);
  }
  function disableButton() {
    setButtonDisabled(true);
  }

  function buttonOnClickHandler() {
    resetContentTagsAutoSuggestions();
    disableButton();
    const contentIDValidation = validateContentID(contentIDRef.current!.value);
    if (!contentIDValidation.success) {
      alert(contentIDValidation.error.message);
      enableButton();
      return;
    }
    const contentTagsValidation = validateContentTags(
      contentTagsStringRef.current!.value
    );
    if (!contentTagsValidation.success && !selectedContentTags.size) {
      alert("At least 1 selected content tag must be present!");
      enableButton();
      return;
    }
    contentIDRef.current!.value = "";
    contentTagsStringRef.current!.value = "";

    const contentID = contentIDValidation.data;
    const contentTags = contentTagsValidation.success
      ? contentTagsValidation.data
      : [...selectedContentTags];

    tagStoreRef.current!.addTags(contentTags, contentID);

    enableButton();
    return;
  }

  function handleContentTagSuggestionClick(suggestion: string) {
    contentTagsStringRef.current!.value = "";
    resetContentTagsAutoSuggestions();
    setSelectedContentTags((prev) => {
      const current = new Set(prev);
      current.add(suggestion);
      return current;
    });
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
          <section className="flex row justifyContentBetween gap-4">
            {selectedContentTags.size ? (
              <section className="flex column gap-8">
                {[...selectedContentTags].map((suggestion) => {
                  return (
                    <div
                      key={suggestion}
                      className="bg-green-1 spacing-8 border-radius-8 cursor-pointer"
                      onClick={() => {
                        if (confirm("Are you sure you want to remove it?")) {
                          setSelectedContentTags((prev) => {
                            const current = new Set(prev);
                            current.delete(suggestion);
                            return current;
                          });
                        }
                      }}
                    >
                      {suggestion}
                    </div>
                  );
                })}
              </section>
            ) : null}
          </section>
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
